<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginAudit;
use App\Models\RegistrationRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email', 'unique:registration_requests,email'],
            'email_responsable' => ['required', 'email', 'exists:users,email'],
            'matricule' => ['required', 'string', 'max:255', 'unique:users,matricule', 'unique:registration_requests,matricule'],
            'departement' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $admin = User::query()->where('role', 'Admin')->where('active', true)->orderBy('id')->first();
        abort_unless($admin, 422, 'Aucun administrateur actif n est disponible pour valider cette inscription.');

        return response()->json([
            'message' => 'Demande d inscription envoyee a l administrateur pour validation.',
            'request' => RegistrationRequest::query()->create([
                'nom' => $validated['nom'],
                'email' => $validated['email'],
                'email_responsable' => $validated['email_responsable'],
                'matricule' => $validated['matricule'],
                'departement' => $validated['departement'] ?? null,
                'requested_password' => $validated['password'],
                'requested_role' => 'Employe',
                'statut' => 'en_attente',
                'admin_email' => $admin->email,
            ])->load(['admin:id,email,nom', 'manager:id,email,nom']),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $registrationRequest = RegistrationRequest::query()->where('email', $credentials['email'])->latest('id')->first();
        if ($registrationRequest?->statut === 'en_attente') {
            return response()->json(['message' => 'Votre demande est en attente de validation par l administrateur.'], 403);
        }

        if ($registrationRequest?->statut === 'refusee') {
            return response()->json(['message' => $registrationRequest->commentaire_admin ?: 'Votre demande a ete refusee par l administrateur.'], 403);
        }

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            LoginAudit::query()->create([
                'attempted_email' => $credentials['email'],
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'success' => false,
                'logged_in_at' => now(),
            ]);
            return response()->json(['message' => 'Identifiants invalides'], 422);
        }

        if (! $user->active) {
            LoginAudit::query()->create([
                'user_email' => $user->email,
                'attempted_email' => $credentials['email'],
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'success' => false,
                'logged_in_at' => now(),
            ]);
            return response()->json(['message' => 'Ce compte est desactive.'], 403);
        }

        LoginAudit::query()->create([
            'user_email' => $user->email,
            'attempted_email' => $credentials['email'],
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'success' => true,
            'logged_in_at' => now(),
        ]);

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api')->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Deconnexion reussie']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'matricule' => ['required', 'string', 'max:255', Rule::unique('users', 'matricule')->ignore($user->id)],
            'departement' => ['nullable', 'string', 'max:255'],
        ]);

        $user->update($validated);

        return response()->json($user->fresh('responsable:id,email,nom'));
    }
}
