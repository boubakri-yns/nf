<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistoriqueApprobation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        $logs = HistoriqueApprobation::query()
            ->with(['note', 'validateur'])
            ->latest('date_decision')
            ->paginate(50);

        return response()->json($logs);
    }
}
