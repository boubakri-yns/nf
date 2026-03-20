<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CategorieDepense;
use App\Services\ExpenseCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategorieDepenseController extends Controller
{
    public function __construct(
        private readonly ExpenseCatalogService $expenseCatalogService
    )
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->expenseCatalogService->ensureDefaults();

        $query = CategorieDepense::query()->orderBy('nom');

        if ($request->user()?->role !== 'Admin') {
            $query->where('active', true);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        $this->expenseCatalogService->ensureDefaults();

        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', 'unique:categories_depense,code'],
            'plafond_journalier' => ['nullable', 'numeric', 'min:0'],
            'justificatif_obligatoire' => ['required', 'boolean'],
            'active' => ['required', 'boolean'],
        ]);

        $categorie = CategorieDepense::query()->create($validated);

        return response()->json($categorie, 201);
    }

    public function update(Request $request, CategorieDepense $categorieDepense): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        $this->expenseCatalogService->ensureDefaults();

        $validated = $request->validate([
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:255', 'unique:categories_depense,code,'.$categorieDepense->id],
            'plafond_journalier' => ['nullable', 'numeric', 'min:0'],
            'justificatif_obligatoire' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $categorieDepense->update($validated);

        return response()->json($categorieDepense->fresh());
    }

    public function destroy(Request $request, CategorieDepense $categorieDepense): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        $this->expenseCatalogService->ensureDefaults();

        $categorieDepense->update(['active' => false]);

        return response()->json(['message' => 'Categorie desactivee']);
    }
}
