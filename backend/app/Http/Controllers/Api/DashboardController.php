<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NoteDeFrais;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();
        $cacheKey = sprintf('dashboard:overview:%s:%s', $user->role, $user->email);

        $payload = Cache::remember($cacheKey, now()->addSeconds(15), function () use ($user): array {
            $query = NoteDeFrais::query()->visibleTo($user);

            $startOfMonth = now()->startOfMonth()->toDateString();
            $endOfMonth = now()->endOfMonth()->toDateString();

            $summary = (clone $query)
                ->selectRaw('COUNT(*) as total_notes')
                ->selectRaw("SUM(CASE WHEN statut IN ('brouillon', 'a_corriger') THEN 1 ELSE 0 END) as notes_en_cours")
                ->selectRaw("SUM(CASE WHEN statut IN ('en_attente_responsable', 'en_attente_rh', 'valide_manager', 'valide_paiement') THEN 1 ELSE 0 END) as notes_en_attente")
                ->selectRaw("SUM(CASE WHEN statut = 'rembourse' THEN 1 ELSE 0 END) as notes_remboursees")
                ->selectRaw("COALESCE(SUM(CASE WHEN date_creation BETWEEN ? AND ? THEN total_note ELSE 0 END), 0) as total_mois", [$startOfMonth, $endOfMonth])
                ->first();

            $recentNotes = (clone $query)
                ->select([
                    'id',
                    'titre_mission',
                    'date_creation',
                    'total_note',
                    'statut',
                    'email_employe',
                    'email_responsable',
                ])
                ->with([
                    'employe:id,nom,email',
                    'responsable:id,nom,email',
                ])
                ->orderByDesc('date_creation')
                ->limit(5)
                ->get();

            return [
                'summary' => [
                    'total_notes' => (int) ($summary->total_notes ?? 0),
                    'notes_en_cours' => (int) ($summary->notes_en_cours ?? 0),
                    'notes_en_attente' => (int) ($summary->notes_en_attente ?? 0),
                    'notes_remboursees' => (int) ($summary->notes_remboursees ?? 0),
                    'total_mois' => round((float) ($summary->total_mois ?? 0), 2),
                ],
                'recent_notes' => $recentNotes,
            ];
        });

        return response()->json($payload);
    }

    public function rhOverview(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'RH', 403);
        $cacheKey = 'dashboard:overview:rh';

        $payload = Cache::remember($cacheKey, now()->addSeconds(15), function (): array {
            $baseQuery = NoteDeFrais::query();
            $startOfMonth = now()->startOfMonth()->toDateString();
            $endOfMonth = now()->endOfMonth()->toDateString();

            $summary = (clone $baseQuery)
                ->selectRaw('COUNT(*) as total_notes')
                ->selectRaw("SUM(CASE WHEN statut IN ('brouillon', 'a_corriger') THEN 1 ELSE 0 END) as notes_en_cours")
                ->selectRaw("SUM(CASE WHEN statut IN ('en_attente_responsable', 'en_attente_rh', 'valide_manager', 'valide_paiement') THEN 1 ELSE 0 END) as notes_en_attente")
                ->selectRaw("SUM(CASE WHEN statut = 'rembourse' THEN 1 ELSE 0 END) as notes_remboursees")
                ->selectRaw("COALESCE(SUM(CASE WHEN date_creation BETWEEN ? AND ? THEN total_note ELSE 0 END), 0) as total_mois", [$startOfMonth, $endOfMonth])
                ->first();

            $pendingRhNotes = NoteDeFrais::query()
                ->select([
                    'id',
                    'titre_mission',
                    'total_note',
                    'statut',
                    'email_employe',
                    'email_responsable',
                    'date_validation_manager',
                ])
                ->with([
                    'employe:id,nom,email',
                    'responsable:id,nom,email',
                ])
                ->whereIn('statut', ['valide_manager', 'en_attente_rh'])
                ->orderByDesc('date_validation_manager')
                ->limit(10)
                ->get();

            $departements = NoteDeFrais::query()
                ->join('users as u', 'u.email', '=', 'notes_de_frais.email_employe')
                ->selectRaw('u.departement as departement, COALESCE(SUM(notes_de_frais.total_note), 0) as montant_total')
                ->groupBy('u.departement')
                ->orderBy('u.departement')
                ->get();

            return [
                'summary' => [
                    'total_notes' => (int) ($summary->total_notes ?? 0),
                    'notes_en_cours' => (int) ($summary->notes_en_cours ?? 0),
                    'notes_en_attente' => (int) ($summary->notes_en_attente ?? 0),
                    'notes_remboursees' => (int) ($summary->notes_remboursees ?? 0),
                    'total_mois' => round((float) ($summary->total_mois ?? 0), 2),
                ],
                'pending_notes' => $pendingRhNotes,
                'departements' => $departements,
            ];
        });

        return response()->json($payload);
    }
}
