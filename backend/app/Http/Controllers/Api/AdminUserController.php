<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistoriqueApprobation;
use App\Models\LoginAudit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with('responsable:id,email,nom')
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->string('role')))
            ->when($request->filled('active'), fn ($query) => $query->where('active', $request->boolean('active')))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $term = '%'.$request->string('search')->trim().'%';
                $query->where(function ($inner) use ($term): void {
                    $inner
                        ->where('nom', 'like', $term)
                        ->orWhere('email', 'like', $term)
                        ->orWhere('matricule', 'like', $term)
                        ->orWhere('departement', 'like', $term);
                });
            })
            ->orderBy('nom')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'email_responsable' => ['nullable', 'email', 'exists:users,email'],
            'role' => ['required', Rule::in(['Employe', 'Manager', 'RH', 'Admin'])],
            'matricule' => ['required', 'string', 'max:255', 'unique:users,matricule'],
            'departement' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'active' => ['sometimes', 'boolean'],
        ]);

        if ($validated['role'] !== 'Employe') {
            $validated['email_responsable'] = null;
        }

        $validated['password'] = Hash::make($validated['password']);
        $validated['active'] = $validated['active'] ?? true;

        $user = User::query()->create($validated);

        return response()->json($user->load('responsable:id,email,nom'), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'email_responsable' => ['nullable', 'email', 'exists:users,email'],
            'role' => ['sometimes', 'required', Rule::in(['Employe', 'Manager', 'RH', 'Admin'])],
            'matricule' => ['sometimes', 'required', 'string', 'max:255', 'unique:users,matricule,'.$user->id],
            'departement' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'confirmed', Password::min(8)],
            'active' => ['sometimes', 'boolean'],
        ]);

        $targetRole = $validated['role'] ?? $user->role;
        $targetEmail = $validated['email'] ?? $user->email;

        if ($targetRole !== 'Employe') {
            $validated['email_responsable'] = null;
        } elseif (($validated['email_responsable'] ?? $user->email_responsable) === $targetEmail) {
            abort(422, 'Un employe ne peut pas etre son propre responsable.');
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $originalEmail = $user->email;
        $user->update($validated);

        if ($originalEmail !== $user->email) {
            User::query()->where('email_responsable', $originalEmail)->update(['email_responsable' => $user->email]);
        }

        return response()->json($user->fresh()->load('responsable:id,email,nom'));
    }

    public function toggleActive(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Vous ne pouvez pas desactiver votre propre compte.');

        $validated = $request->validate([
            'active' => ['required', 'boolean'],
        ]);

        $user->update(['active' => $validated['active']]);

        return response()->json($user->fresh()->load('responsable:id,email,nom'));
    }

    public function impersonate(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Vous etes deja connecte avec ce compte.');
        abort_if(! $user->active, 422, 'Impossible d impersoner un compte desactive.');

        $token = $user->createToken('admin-impersonation')->plainTextToken;

        LoginAudit::query()->create([
            'user_email' => $user->email,
            'attempted_email' => $user->email,
            'impersonated_by_email' => $request->user()->email,
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'success' => true,
            'logged_in_at' => now(),
        ]);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if($user->id === $request->user()->id, 422, 'Vous ne pouvez pas supprimer votre propre compte.');

        $hasManagedNotes = $user->notesAValider()->exists();
        abort_if($hasManagedNotes, 422, 'Impossible de supprimer ce compte car il est encore responsable de notes de frais.');

        $hasApprovalHistory = HistoriqueApprobation::query()
            ->where('validateur_email', $user->email)
            ->exists();
        abort_if($hasApprovalHistory, 422, 'Impossible de supprimer ce compte car il apparait dans l historique des validations.');

        $user->tokens()->delete();

        LoginAudit::query()
            ->where('user_email', $user->email)
            ->orWhere('attempted_email', $user->email)
            ->orWhere('impersonated_by_email', $user->email)
            ->delete();

        $user->delete();

        return response()->json([
            'message' => 'Compte supprime avec succes.',
        ]);
    }
}
