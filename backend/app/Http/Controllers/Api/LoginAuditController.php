<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoginAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'Admin', 403);

        $audits = LoginAudit::query()
            ->when($request->filled('search'), function ($query) use ($request): void {
                $term = '%'.$request->string('search')->trim().'%';
                $query->where(function ($inner) use ($term): void {
                    $inner
                        ->where('user_email', 'like', $term)
                        ->orWhere('attempted_email', 'like', $term)
                        ->orWhere('impersonated_by_email', 'like', $term)
                        ->orWhere('ip_address', 'like', $term);
                });
            })
            ->latest('logged_in_at')
            ->paginate(100);

        return response()->json($audits);
    }
}
