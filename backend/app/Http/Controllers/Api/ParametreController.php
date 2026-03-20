<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        return response()->json(Parametre::query()->orderBy('cle')->get());
    }

    public function update(Request $request, Parametre $parametre): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        $validated = $request->validate([
            'valeur' => ['required', 'string'],
            'description' => ['nullable', 'string'],
        ]);

        $parametre->update($validated);

        return response()->json($parametre->fresh());
    }
}
