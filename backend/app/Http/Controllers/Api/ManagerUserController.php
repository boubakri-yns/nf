<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DemoAccountsService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ManagerUserController extends Controller
{
    public function __construct(
        private readonly DemoAccountsService $demoAccountsService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $manager = $request->user();

        $users = $this->buildManagedUsersQuery($request, $manager->email)->get();

        if ($users->isEmpty() && $this->isDemoManager($manager->email)) {
            $this->demoAccountsService->restore();
            $users = $this->buildManagedUsersQuery($request, $manager->email)->get();
        }

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $manager = $request->user();

        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'matricule' => ['required', 'string', 'max:255', 'unique:users,matricule'],
            'departement' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'active' => ['sometimes', 'boolean'],
        ]);

        $user = User::query()->create([
            'nom' => $validated['nom'],
            'email' => $validated['email'],
            'email_responsable' => $manager->email,
            'role' => 'Employe',
            'matricule' => $validated['matricule'],
            'departement' => $validated['departement'] ?? null,
            'password' => Hash::make($validated['password']),
            'active' => $validated['active'] ?? true,
        ]);

        return response()->json($user->load('responsable:id,email,nom'), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $manager = $request->user();

        abort_if($user->role !== 'Employe' || $user->email_responsable !== $manager->email, 403, 'Acces non autorise a cet utilisateur.');

        $validated = $request->validate([
            'nom' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'matricule' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('users', 'matricule')->ignore($user->id)],
            'departement' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'confirmed', Password::min(8)],
            'active' => ['sometimes', 'boolean'],
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $validated['role'] = 'Employe';
        $validated['email_responsable'] = $manager->email;

        $user->update($validated);

        return response()->json($user->fresh()->load('responsable:id,email,nom'));
    }

    public function toggleActive(Request $request, User $user): JsonResponse
    {
        $manager = $request->user();

        abort_if($user->role !== 'Employe' || $user->email_responsable !== $manager->email, 403, 'Acces non autorise a cet utilisateur.');

        $validated = $request->validate([
            'active' => ['required', 'boolean'],
        ]);

        $user->update(['active' => $validated['active']]);

        return response()->json($user->fresh()->load('responsable:id,email,nom'));
    }

    private function buildManagedUsersQuery(Request $request, string $managerEmail)
    {
        return User::query()
            ->with('responsable:id,email,nom')
            ->where('role', 'Employe')
            ->where('email_responsable', $managerEmail)
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
            ->orderBy('nom');
    }

    private function isDemoManager(string $email): bool
    {
        return in_array($email, [
            'manager1.app@nf.com',
            'manager2.app@nf.com',
        ], true);
    }
}
