<?php

namespace App\Services;

use App\Models\NoteDeFrais;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class ReimbursementDocumentService
{
    public function generateReference(NoteDeFrais $note): string
    {
        return sprintf('REF-%s-%04d', now()->format('Ymd'), $note->id);
    }

    public function create(NoteDeFrais $note, User $rhUser): string
    {
        $disk = config('filesystems.default', 'public');

        if ($note->document_remboursement_path) {
            Storage::disk($disk)->delete($note->document_remboursement_path);
        }

        $safeTitle = preg_replace('/[^A-Za-z0-9\-]+/', '-', strtolower($note->titre_mission)) ?: 'note';
        $path = sprintf(
            'remboursements/note-%d-%s-%s.txt',
            $note->id,
            $safeTitle,
            strtolower($note->reference_comptable ?? $this->generateReference($note))
        );

        Storage::disk($disk)->put($path, $this->renderContent($note, $rhUser));

        return $path;
    }

    private function renderContent(NoteDeFrais $note, User $rhUser): string
    {
        $lines = [
            'DOCUMENT DE REMBOURSEMENT',
            '=========================',
            '',
            'Reference comptable: '.($note->reference_comptable ?? $this->generateReference($note)),
            'Statut: '.$note->statut,
            'Mission: '.$note->titre_mission,
            'Montant total: '.number_format((float) $note->total_note, 2, '.', ' ').' DH',
            'Date creation: '.($note->date_creation?->format('Y-m-d') ?? (string) $note->date_creation),
            'Date soumission: '.($note->date_soumission?->format('Y-m-d H:i:s') ?? 'N/A'),
            'Date validation manager: '.($note->date_validation_manager?->format('Y-m-d H:i:s') ?? 'N/A'),
            'Date remboursement: '.($note->date_remboursement?->format('Y-m-d H:i:s') ?? 'N/A'),
            'Paiement effectue le: '.($note->paiement_effectue_le?->format('Y-m-d') ?? 'N/A'),
            'Mode remboursement: '.($note->mode_remboursement ?? 'N/A'),
            '',
            'ACTEURS',
            '-------',
            'Employe: '.($note->employe?->nom ?? $note->email_employe).' <'.$note->email_employe.'>',
            'Manager: '.($note->responsable?->nom ?? $note->email_responsable).' <'.$note->email_responsable.'>',
            'RH validateur: '.$rhUser->nom.' <'.$rhUser->email.'>',
            '',
            'LIGNES DE DEPENSE',
            '-----------------',
        ];

        foreach ($note->lignesDepense as $expense) {
            $lines[] = sprintf(
                '- %s | %s | %s DH | %s',
                $expense->date_depense,
                $expense->categorie?->nom ?? 'Categorie',
                number_format((float) $expense->montant, 2, '.', ' '),
                $expense->commentaire ?? 'Sans commentaire'
            );
        }

        $lines[] = '';
        $lines[] = 'HISTORIQUE';
        $lines[] = '----------';

        foreach ($note->historique as $history) {
            $lines[] = sprintf(
                '- %s | %s | %s | %s',
                $history->date_decision,
                $history->action,
                $history->validateur?->nom ?? $history->validateur_email,
                $history->commentaire ?? 'Sans commentaire'
            );
        }

        return implode(PHP_EOL, $lines).PHP_EOL;
    }
}
