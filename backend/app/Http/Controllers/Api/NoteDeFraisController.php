<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistoriqueApprobation;
use App\Models\LigneDepense;
use App\Models\NoteDeFrais;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\ReimbursementDocumentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NoteDeFraisController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly ReimbursementDocumentService $reimbursementDocumentService
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $sort = $request->string('sort')->value() ?: 'date_creation';
        $direction = $request->string('direction')->value() === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['date_creation', 'date_soumission', 'date_validation_manager', 'total_note', 'email_employe', 'titre_mission', 'statut'];

        $requestedStatus = $request->string('statut')->value();

        $notes = NoteDeFrais::query()
            ->select([
                'id',
                'titre_mission',
                'matricule_employe',
                'date_creation',
                'total_note',
                'statut',
                'email_employe',
                'email_responsable',
                'commentaire_employe',
                'date_soumission',
                'date_validation_manager',
                'date_remboursement',
                'mode_remboursement',
                'reference_comptable',
                'paiement_effectue_le',
                'document_remboursement_path',
                'archived_at',
            ])
            ->with([
                'employe:id,nom,email,email_responsable,role,matricule,departement,active',
                'responsable:id,nom,email,email_responsable,role,matricule,departement,active',
            ])
            ->when($request->filled('statut'), function (Builder $q) use ($requestedStatus): void {
                if ($requestedStatus === 'valide_manager') {
                    $q->whereIn('statut', ['valide_manager', 'en_attente_rh']);
                    return;
                }

                if ($requestedStatus === 'valide_rh') {
                    $q->whereIn('statut', ['valide_rh', 'valide_paiement']);
                    return;
                }

                $q->where('statut', $requestedStatus);
            })
            ->when($request->filled('search'), function (Builder $q) use ($request): void {
                $term = '%'.$request->string('search').'%';
                $q->where(function (Builder $inner) use ($term): void {
                    $inner
                        ->where('titre_mission', 'like', $term)
                        ->orWhere('email_employe', 'like', $term)
                        ->orWhere('matricule_employe', 'like', $term)
                        ->orWhereHas('employe', fn (Builder $employee) => $employee->where('nom', 'like', $term));
                });
            })
            ->when($request->filled('email_employe'), function (Builder $q) use ($request): void {
                $q->where('email_employe', 'like', '%'.$request->string('email_employe')->trim().'%');
            })
            ->when($request->filled('email_responsable'), function (Builder $q) use ($request): void {
                $q->where('email_responsable', 'like', '%'.$request->string('email_responsable')->trim().'%');
            })
            ->when($request->filled('departement'), function (Builder $q) use ($request): void {
                $term = '%'.$request->string('departement')->trim().'%';
                $q->whereHas('employe', fn (Builder $employee) => $employee->where('departement', 'like', $term));
            })
            ->when($request->filled('date_debut'), fn (Builder $q) => $q->whereDate('date_creation', '>=', $request->string('date_debut')))
            ->when($request->filled('date_fin'), fn (Builder $q) => $q->whereDate('date_creation', '<=', $request->string('date_fin')))
            ->when($request->filled('montant_min'), fn (Builder $q) => $q->where('total_note', '>=', (float) $request->input('montant_min')))
            ->when($request->filled('montant_max'), fn (Builder $q) => $q->where('total_note', '<=', (float) $request->input('montant_max')))
            ->visibleTo($user)
            ->when(in_array($sort, $allowedSorts, true), fn (Builder $q) => $q->orderBy($sort, $direction), fn (Builder $q) => $q->latest())
            ->paginate(10);

        return response()->json($notes);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'Employe') {
            abort(403, 'Seuls les employes peuvent creer une note.');
        }

        $validated = $request->validate([
            'titre_mission' => ['required', 'string', 'max:255'],
            'date_creation' => ['required', 'date'],
            'commentaire_employe' => ['nullable', 'string'],
            'statut' => ['nullable', 'in:brouillon,en_attente_responsable'],
        ]);

        $status = $validated['statut'] ?? 'brouillon';

        $note = NoteDeFrais::query()->create([
            ...$validated,
            'matricule_employe' => $user->matricule,
            'total_note' => 0,
            'statut' => $status,
            'email_employe' => $user->email,
            'email_responsable' => $user->email_responsable,
            'date_soumission' => $status === 'en_attente_responsable' ? now() : null,
        ]);

        $this->notificationService->send(
            $note->email_employe,
            'note_soumise',
            $status === 'en_attente_responsable' ? 'Note creee et soumise' : 'Note creee',
            $status === 'en_attente_responsable'
                ? 'Votre note "'.$note->titre_mission.'" a ete creee et envoyee au manager pour validation.'
                : 'Votre note "'.$note->titre_mission.'" a ete creee en brouillon.',
            ['note_id' => $note->id]
        );

        if ($status === 'en_attente_responsable') {
            $this->notificationService->send(
                $note->email_responsable,
                'note_soumise',
                'Nouvelle note a valider',
                'La note "'.$note->titre_mission.'" est en attente de validation.',
                ['note_id' => $note->id]
            );
        }

        return response()->json($note->load(['employe', 'responsable']), 201);
    }

    public function show(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $this->authorize('view', $noteDeFrai);

        return response()->json($noteDeFrai->load(['employe', 'responsable', 'lignesDepense.categorie', 'historique.validateur']));
    }

    public function telechargerDocumentRemboursement(Request $request, NoteDeFrais $noteDeFrai): StreamedResponse
    {
        $this->authorize('view', $noteDeFrai);

        abort_unless($noteDeFrai->document_remboursement_path, 404, 'Aucun document de remboursement disponible.');

        $disk = config('filesystems.default', 'public');
        abort_unless(Storage::disk($disk)->exists($noteDeFrai->document_remboursement_path), 404, 'Document introuvable.');

        return Storage::disk($disk)->download(
            $noteDeFrai->document_remboursement_path,
            basename($noteDeFrai->document_remboursement_path),
            ['Content-Type' => 'text/plain; charset=UTF-8']
        );
    }

    public function update(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $this->authorize('update', $noteDeFrai);

        $validated = $request->validate([
            'titre_mission' => ['sometimes', 'required', 'string', 'max:255'],
            'date_creation' => ['sometimes', 'required', 'date'],
            'commentaire_employe' => ['nullable', 'string'],
            'statut' => ['sometimes', 'required', 'in:brouillon,en_attente_responsable'],
        ]);

        $targetStatus = $validated['statut'] ?? $noteDeFrai->statut;

        if ($targetStatus === 'en_attente_responsable' && $noteDeFrai->lignesDepense()->count() === 0) {
            return response()->json(['message' => 'Ajoutez au moins une depense avant soumission.'], 422);
        }

        $payload = $validated;

        if ($targetStatus === 'en_attente_responsable') {
            $payload['statut'] = 'en_attente_responsable';
            $payload['date_soumission'] = now();
        }

        if ($targetStatus === 'brouillon') {
            $payload['statut'] = 'brouillon';
        }

        $noteDeFrai->update($payload);

        if ($noteDeFrai->wasChanged('statut') && $noteDeFrai->statut === 'en_attente_responsable') {
            $this->notificationService->send(
                $noteDeFrai->email_responsable,
                'note_soumise',
                'Nouvelle note a valider',
                'La note "'.$noteDeFrai->titre_mission.'" est en attente de validation.',
                ['note_id' => $noteDeFrai->id]
            );
        }

        return response()->json($noteDeFrai->fresh(['employe', 'responsable']));
    }

    public function destroy(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $this->authorize('update', $noteDeFrai);
        abort_unless($noteDeFrai->statut === 'brouillon', 422, 'Seules les notes en brouillon peuvent etre supprimees.');
        $noteDeFrai->delete();

        return response()->json(['message' => 'Note supprimee']);
    }

    public function soumettre(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $this->authorize('update', $noteDeFrai);

        if ($noteDeFrai->lignesDepense()->count() === 0) {
            return response()->json(['message' => 'Ajoutez au moins une depense avant soumission.'], 422);
        }

        $noteDeFrai->update([
            'statut' => 'en_attente_responsable',
            'date_soumission' => now(),
        ]);

        $this->notificationService->send(
            $noteDeFrai->email_responsable,
            'note_soumise',
            'Nouvelle note a valider',
            'La note "'.$noteDeFrai->titre_mission.'" est en attente de validation.',
            ['note_id' => $noteDeFrai->id]
        );

        return response()->json($noteDeFrai->fresh());
    }

    public function changerStatut(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'in:approuve_manager,approuve_rh,refuse,demande_correction,rembourse,archiver'],
            'commentaire' => ['nullable', 'string', 'required_if:action,refuse,demande_correction'],
            'mode_remboursement' => ['nullable', 'in:virement_salaire,virement_bancaire,cheque'],
            'paiement_effectue_le' => ['nullable', 'date'],
            'litige_commentaire' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $action = $validated['action'];

        $nextStatus = match ($action) {
            'approuve_manager' => 'en_attente_rh',
            'approuve_rh' => 'valide_paiement',
            'rembourse' => 'rembourse',
            'archiver' => 'rembourse',
            'refuse' => 'refuse',
            'demande_correction' => 'a_corriger',
        };

        if ($action === 'approuve_manager' || $action === 'demande_correction') {
            $this->authorize('validateAsManager', $noteDeFrai);
        }

        if ($action === 'approuve_rh') {
            $this->authorize('validateAsRh', $noteDeFrai);
        }

        if ($action === 'rembourse') {
            abort_unless($user->role === 'RH', 403, 'Seul le service RH peut marquer une note comme remboursee.');
            abort_unless(in_array($noteDeFrai->statut, ['en_attente_rh', 'valide_manager', 'valide_paiement'], true), 422, 'La note doit etre validee manager avant remboursement.');
            abort_if(empty($validated['mode_remboursement']), 422, 'Le mode de remboursement est obligatoire.');
        }

        if ($action === 'refuse') {
            if ($noteDeFrai->statut === 'en_attente_responsable') {
                $this->authorize('validateAsManager', $noteDeFrai);
            } elseif (in_array($noteDeFrai->statut, ['en_attente_rh', 'valide_manager', 'valide_paiement'], true)) {
                abort_unless($user->role === 'RH', 403, 'Seuls les RH peuvent refuser definitivement une note a ce stade.');
            } else {
                abort(422, 'La note ne peut pas etre refusee dans ce statut.');
            }
        }

        if ($action === 'archiver') {
            abort_unless($user->role === 'RH', 403, 'Seuls les RH peuvent archiver une note.');
            abort_unless($noteDeFrai->statut === 'rembourse', 422, 'Seules les notes remboursees peuvent etre archivees.');
        }

        $generatedReference = null;

        DB::transaction(function () use ($noteDeFrai, $user, $action, $nextStatus, $validated, &$generatedReference): void {
            $payload = ['statut' => $nextStatus];

            if ($action === 'approuve_manager') {
                $payload['date_validation_manager'] = now();
            }

            if ($action === 'approuve_rh') {
                $payload['date_remboursement'] = null;
            }

            if ($action === 'rembourse') {
                $generatedReference = $this->reimbursementDocumentService->generateReference($noteDeFrai);
                $payload['date_remboursement'] = now();
                $payload['mode_remboursement'] = $validated['mode_remboursement'];
                $payload['reference_comptable'] = $generatedReference;
                $payload['paiement_effectue_le'] = $validated['paiement_effectue_le'] ?? now()->toDateString();
                $payload['litige_commentaire'] = $validated['litige_commentaire'] ?? null;
            }

            if ($action === 'archiver') {
                $payload['archived_at'] = now();
            }

            if ($action === 'refuse' && $user->role === 'RH') {
                $payload['litige_commentaire'] = $validated['litige_commentaire'] ?? $validated['commentaire'] ?? null;
            }

            $noteDeFrai->update($payload);

            HistoriqueApprobation::query()->create([
                'note_de_frais_id' => $noteDeFrai->id,
                'validateur_email' => $user->email,
                'action' => $action,
                'date_decision' => now(),
                'commentaire' => $validated['commentaire'] ?? null,
            ]);
        });

        if ($action === 'rembourse') {
            $path = $this->reimbursementDocumentService->create(
                $noteDeFrai->fresh(['employe', 'responsable', 'lignesDepense.categorie', 'historique.validateur']),
                $user
            );

            $noteDeFrai->update(['document_remboursement_path' => $path]);
        }

        $freshNote = $noteDeFrai->fresh(['historique', 'employe', 'responsable', 'lignesDepense.categorie']);

        $this->dispatchStatusNotifications($freshNote, $action, $validated['commentaire'] ?? null, $user);

        return response()->json($freshNote);
    }

    private function dispatchStatusNotifications(NoteDeFrais $note, string $action, ?string $commentaire, User $actor): void
    {
        if ($action === 'approuve_manager') {
            $this->notificationService->send(
                $note->email_employe,
                'note_approuvee',
                'Note approuvee par manager',
                'Votre note "'.$note->titre_mission.'" a ete transmise aux RH.',
                ['note_id' => $note->id]
            );

            User::query()->where('role', 'RH')->pluck('email')->each(function (string $rhEmail) use ($note): void {
                $this->notificationService->send(
                    $rhEmail,
                    'note_approuvee',
                    'Note en attente RH',
                    'Une note est en attente de controle RH.',
                    ['note_id' => $note->id]
                );
            });
        }

        if ($action === 'refuse') {
            $this->notificationService->send(
                $note->email_employe,
                'note_refusee',
                'Note refusee',
                'Votre note "'.$note->titre_mission.'" a ete refusee. Motif: '.($commentaire ?? 'Non renseigne'),
                ['note_id' => $note->id]
            );

            if ($actor->role === 'RH') {
                $this->notificationService->send(
                    $note->email_responsable,
                    'note_refusee',
                    'Note refusee par RH',
                    'La note "'.$note->titre_mission.'" a ete refusee par les RH. Motif: '.($commentaire ?? 'Non renseigne'),
                    ['note_id' => $note->id]
                );
            }
        }

        if ($action === 'demande_correction') {
            $this->notificationService->send(
                $note->email_employe,
                'note_correction',
                'Correction demandee',
                'Une correction est demandee: '.($commentaire ?? 'Voir le detail de la note'),
                ['note_id' => $note->id]
            );
        }

        if ($action === 'approuve_rh') {
            $this->notificationService->send(
                $note->email_employe,
                'note_approuvee',
                'Note validee pour paiement',
                'Votre note "'.$note->titre_mission.'" est validee pour paiement.',
                ['note_id' => $note->id]
            );
        }

        if ($action === 'rembourse') {
            $this->notificationService->send(
                $note->email_employe,
                'note_remboursee',
                'Note remboursee',
                'Votre note "'.$note->titre_mission.'" a ete remboursee. Reference comptable: '.$note->reference_comptable.'.',
                ['note_id' => $note->id, 'document_remboursement' => true],
                $note->document_remboursement_path,
                'document-remboursement-note-'.$note->id.'.txt'
            );
        }
    }

    public static function recalculateTotal(int $noteId): void
    {
        $total = LigneDepense::query()->where('note_de_frais_id', $noteId)->sum('montant');
        NoteDeFrais::query()->whereKey($noteId)->update(['total_note' => $total]);
    }
}
