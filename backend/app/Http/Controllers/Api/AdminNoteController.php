<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CategorieDepense;
use App\Models\HistoriqueApprobation;
use App\Models\LigneDepense;
use App\Models\NoteDeFrais;
use App\Models\Parametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminNoteController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'justification' => ['required', 'string', 'min:5'],
            'titre_mission' => ['required', 'string', 'max:255'],
            'date_creation' => ['required', 'date'],
            'commentaire_employe' => ['nullable', 'string'],
            'email_employe' => ['required', 'email', 'exists:users,email'],
            'email_responsable' => ['nullable', 'email', 'exists:users,email'],
            'statut' => ['nullable', Rule::in([
                'brouillon',
                'en_attente_responsable',
                'valide_manager',
                'en_attente_rh',
                'valide_rh',
                'valide_paiement',
                'refuse',
                'rembourse',
                'a_corriger',
            ])],
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => $validated['titre_mission'],
            'matricule_employe' => $request->string('matricule_employe')->value()
                ?: $this->resolveEmployeeMatricule($validated['email_employe']),
            'date_creation' => $validated['date_creation'],
            'total_note' => 0,
            'statut' => $validated['statut'] ?? 'brouillon',
            'email_employe' => $validated['email_employe'],
            'email_responsable' => $validated['email_responsable'] ?? $this->resolveManagerEmail($validated['email_employe']),
            'commentaire_employe' => $validated['commentaire_employe'] ?? null,
            'date_soumission' => in_array($validated['statut'] ?? 'brouillon', ['en_attente_responsable', 'valide_manager', 'en_attente_rh', 'valide_rh', 'valide_paiement', 'rembourse'], true)
                ? now()
                : null,
        ]);

        $this->logAction($request, $note, 'admin_update', 'Creation admin - '.$validated['justification']);

        return $this->respondWithNote($note, 201);
    }

    public function update(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $validated = $request->validate([
            'titre_mission' => ['sometimes', 'required', 'string', 'max:255'],
            'date_creation' => ['sometimes', 'required', 'date'],
            'commentaire_employe' => ['nullable', 'string'],
            'email_employe' => ['sometimes', 'required', 'email', 'exists:users,email'],
            'email_responsable' => ['nullable', 'email', 'exists:users,email'],
            'mode_remboursement' => ['nullable', Rule::in(['virement_salaire', 'virement_bancaire', 'cheque'])],
            'paiement_effectue_le' => ['nullable', 'date'],
            'reference_comptable' => ['nullable', 'string', 'max:255'],
            'litige_commentaire' => ['nullable', 'string'],
        ]);

        $noteDeFrai->update($validated);
        $this->logAction($request, $noteDeFrai, 'admin_update', 'Modification admin');

        return $this->respondWithNote($noteDeFrai);
    }

    public function forceStatus(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $validated = $request->validate([
            'statut' => ['required', Rule::in([
                'brouillon',
                'en_attente_responsable',
                'valide_manager',
                'en_attente_rh',
                'valide_rh',
                'valide_paiement',
                'refuse',
                'rembourse',
                'a_corriger',
            ])],
            'justification' => ['required', 'string', 'min:5'],
        ]);

        $noteDeFrai->update(['statut' => $validated['statut']]);
        $this->logAction(
            $request,
            $noteDeFrai,
            'admin_force_status',
            'Statut force vers '.$validated['statut'].' - '.$validated['justification']
        );

        return $this->respondWithNote($noteDeFrai);
    }

    public function storeExpense(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $validated = $request->validate([
            'justification' => ['required', 'string', 'min:5'],
            'categorie_id' => ['required', 'exists:categories_depense,id'],
            'date_depense' => ['required', 'date'],
            'montant' => ['required', 'numeric', 'min:0.01'],
            'commentaire' => ['nullable', 'string'],
            'justificatif' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $this->storeReceiptIfPresent($request);
        $this->assertReceiptRules((int) $validated['categorie_id'], (float) $validated['montant'], $path);

        LigneDepense::query()->create([
            'note_de_frais_id' => $noteDeFrai->id,
            'categorie_id' => $validated['categorie_id'],
            'date_depense' => $validated['date_depense'],
            'montant' => $validated['montant'],
            'commentaire' => $validated['commentaire'] ?? null,
            'justificatif_path' => $path,
        ]);

        NoteDeFraisController::recalculateTotal($noteDeFrai->id);
        $this->logAction($request, $noteDeFrai, 'admin_expense_add', $validated['justification']);

        return $this->respondWithNote($noteDeFrai, 201);
    }

    public function updateExpense(Request $request, LigneDepense $ligneDepense): JsonResponse
    {
        $note = $ligneDepense->note;
        $validated = $request->validate([
            'justification' => ['required', 'string', 'min:5'],
            'categorie_id' => ['sometimes', 'required', 'exists:categories_depense,id'],
            'date_depense' => ['sometimes', 'required', 'date'],
            'montant' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'commentaire' => ['nullable', 'string'],
            'justificatif' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        if ($request->hasFile('justificatif')) {
            if ($ligneDepense->justificatif_path) {
                Storage::disk(config('filesystems.default', 'public'))->delete($ligneDepense->justificatif_path);
            }

            $validated['justificatif_path'] = $request->file('justificatif')->store('justificatifs', config('filesystems.default', 'public'));
        }

        $categorieId = (int) ($validated['categorie_id'] ?? $ligneDepense->categorie_id);
        $montant = (float) ($validated['montant'] ?? $ligneDepense->montant);
        $this->assertReceiptRules($categorieId, $montant, $validated['justificatif_path'] ?? $ligneDepense->justificatif_path);

        unset($validated['justification']);
        $ligneDepense->update($validated);
        NoteDeFraisController::recalculateTotal($note->id);
        $this->logAction($request, $note, 'admin_expense_update', $request->string('justification')->value());

        return $this->respondWithNote($note);
    }

    public function destroyExpense(Request $request, LigneDepense $ligneDepense): JsonResponse
    {
        $validated = $request->validate([
            'justification' => ['required', 'string', 'min:5'],
        ]);

        $note = $ligneDepense->note;

        if ($ligneDepense->justificatif_path) {
            Storage::disk(config('filesystems.default', 'public'))->delete($ligneDepense->justificatif_path);
        }

        $ligneDepense->delete();
        NoteDeFraisController::recalculateTotal($note->id);
        $this->logAction($request, $note, 'admin_expense_delete', $validated['justification']);

        return $this->respondWithNote($note);
    }

    public function deleteReceipt(Request $request, LigneDepense $ligneDepense): JsonResponse
    {
        $validated = $request->validate([
            'justification' => ['required', 'string', 'min:5'],
        ]);

        $note = $ligneDepense->note;
        abort_if(! $ligneDepense->justificatif_path, 404, 'Aucun justificatif a supprimer.');

        Storage::disk(config('filesystems.default', 'public'))->delete($ligneDepense->justificatif_path);
        $ligneDepense->update(['justificatif_path' => null]);

        $this->logAction($request, $note, 'admin_receipt_delete', $validated['justification']);

        return $this->respondWithNote($note);
    }

    public function destroy(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $this->logAction($request, $noteDeFrai, 'admin_update', 'Suppression admin');

        foreach ($noteDeFrai->lignesDepense as $expense) {
            if ($expense->justificatif_path) {
                Storage::disk(config('filesystems.default', 'public'))->delete($expense->justificatif_path);
            }
        }

        if ($noteDeFrai->document_remboursement_path) {
            Storage::disk(config('filesystems.default', 'public'))->delete($noteDeFrai->document_remboursement_path);
        }

        $noteDeFrai->delete();

        return response()->json(['message' => 'Note supprimee']);
    }

    private function respondWithNote(NoteDeFrais $note, int $status = 200): JsonResponse
    {
        return response()->json(
            $note->fresh(['employe', 'responsable', 'lignesDepense.categorie', 'historique.validateur']),
            $status
        );
    }

    private function logAction(Request $request, NoteDeFrais $note, string $action, string $commentaire): void
    {
        HistoriqueApprobation::query()->create([
            'note_de_frais_id' => $note->id,
            'validateur_email' => $request->user()->email,
            'action' => $action,
            'date_decision' => now(),
            'commentaire' => $commentaire,
        ]);
    }

    private function storeReceiptIfPresent(Request $request): ?string
    {
        if (! $request->hasFile('justificatif')) {
            return null;
        }

        return $request->file('justificatif')->store('justificatifs', config('filesystems.default', 'public'));
    }

    private function assertReceiptRules(int $categorieId, float $montant, ?string $justificatifPath): void
    {
        $categorie = CategorieDepense::query()->findOrFail($categorieId);
        $seuilJustificatif = (float) (Parametre::query()->where('cle', 'SEUIL_JUSTIFICATIF')->value('valeur') ?? 50);

        if (($categorie->justificatif_obligatoire || $montant >= $seuilJustificatif) && ! $justificatifPath) {
            abort(422, 'Un justificatif est obligatoire pour cette depense.');
        }
    }

    private function resolveEmployeeMatricule(string $email): string
    {
        return (string) \App\Models\User::query()->where('email', $email)->value('matricule');
    }

    private function resolveManagerEmail(string $employeeEmail): ?string
    {
        return \App\Models\User::query()->where('email', $employeeEmail)->value('email_responsable');
    }
}
