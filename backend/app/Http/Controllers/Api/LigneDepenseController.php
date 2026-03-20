<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CategorieDepense;
use App\Models\LigneDepense;
use App\Models\NoteDeFrais;
use App\Models\Parametre;
use App\Services\ExpenseCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LigneDepenseController extends Controller
{
    public function __construct(
        private readonly ExpenseCatalogService $expenseCatalogService
    )
    {
    }

    public function store(Request $request, NoteDeFrais $noteDeFrai): JsonResponse
    {
        $this->authorize('update', $noteDeFrai);

        $this->expenseCatalogService->ensureDefaults();

        $validated = $request->validate([
            'categorie_id' => ['required', 'exists:categories_depense,id'],
            'date_depense' => ['required', 'date'],
            'montant' => ['required', 'numeric', 'min:0.01'],
            'commentaire' => ['nullable', 'string'],
            'justificatif' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $categorie = CategorieDepense::query()->findOrFail($validated['categorie_id']);
        $seuilJustificatif = (float) (Parametre::query()->where('cle', 'SEUIL_JUSTIFICATIF')->value('valeur') ?? 50);

        if (($categorie->justificatif_obligatoire || (float) $validated['montant'] >= $seuilJustificatif) && ! $request->hasFile('justificatif')) {
            return response()->json(['message' => 'Un justificatif est obligatoire pour cette depense.'], 422);
        }

        $path = null;
        if ($request->hasFile('justificatif')) {
            $disk = config('filesystems.default', 'public');
            $path = $request->file('justificatif')->store('justificatifs', $disk);
        }

        LigneDepense::query()->create([
            ...$validated,
            'note_de_frais_id' => $noteDeFrai->id,
            'justificatif_path' => $path,
        ]);

        NoteDeFraisController::recalculateTotal($noteDeFrai->id);

        return $this->respondWithNote($noteDeFrai, 201);
    }

    public function update(Request $request, LigneDepense $ligneDepense): JsonResponse
    {
        $note = $ligneDepense->note;
        $this->authorize('update', $note);

        $this->expenseCatalogService->ensureDefaults();

        $validated = $request->validate([
            'categorie_id' => ['sometimes', 'required', 'exists:categories_depense,id'],
            'date_depense' => ['sometimes', 'required', 'date'],
            'montant' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'commentaire' => ['nullable', 'string'],
            'justificatif' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $categorieId = (int) ($validated['categorie_id'] ?? $ligneDepense->categorie_id);
        $montant = (float) ($validated['montant'] ?? $ligneDepense->montant);
        $categorie = CategorieDepense::query()->findOrFail($categorieId);
        $seuilJustificatif = (float) (Parametre::query()->where('cle', 'SEUIL_JUSTIFICATIF')->value('valeur') ?? 50);

        if (($categorie->justificatif_obligatoire || $montant >= $seuilJustificatif) && ! $request->hasFile('justificatif') && ! $ligneDepense->justificatif_path) {
            return response()->json(['message' => 'Un justificatif est obligatoire pour cette depense.'], 422);
        }

        if ($request->hasFile('justificatif')) {
            if ($ligneDepense->justificatif_path) {
                Storage::disk(config('filesystems.default', 'public'))->delete($ligneDepense->justificatif_path);
            }

            $validated['justificatif_path'] = $request->file('justificatif')->store('justificatifs', config('filesystems.default', 'public'));
        }

        $ligneDepense->update($validated);
        NoteDeFraisController::recalculateTotal($note->id);

        return $this->respondWithNote($note);
    }

    public function destroy(Request $request, LigneDepense $ligneDepense): JsonResponse
    {
        $note = $ligneDepense->note;
        $this->authorize('update', $note);

        if ($ligneDepense->justificatif_path) {
            Storage::disk(config('filesystems.default', 'public'))->delete($ligneDepense->justificatif_path);
        }

        $ligneDepense->delete();
        NoteDeFraisController::recalculateTotal($note->id);

        return $this->respondWithNote($note);
    }

    public function telechargerJustificatif(Request $request, LigneDepense $ligneDepense): StreamedResponse
    {
        $note = $ligneDepense->note;
        $this->authorize('view', $note);

        abort_if(! $ligneDepense->justificatif_path, 404, 'Aucun justificatif disponible pour cette depense.');

        $disk = config('filesystems.default', 'public');

        return Storage::disk($disk)->download($ligneDepense->justificatif_path);
    }

    private function respondWithNote(NoteDeFrais $note, int $status = 200): JsonResponse
    {
        return response()->json(
            $note->fresh(['employe', 'responsable', 'lignesDepense.categorie', 'historique.validateur']),
            $status
        );
    }
}
