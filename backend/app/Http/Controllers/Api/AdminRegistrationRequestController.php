<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RegistrationRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\RegistrationAccessFileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AdminRegistrationRequestController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly RegistrationAccessFileService $registrationAccessFileService
    ) {
    }

    public function index(): JsonResponse
    {
        $requests = RegistrationRequest::query()
            ->with(['admin:id,email,nom', 'manager:id,email,nom'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($requests);
    }

    public function decide(Request $request, RegistrationRequest $registrationRequest): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'commentaire' => ['nullable', 'string', 'max:1000'],
        ]);

        abort_if($registrationRequest->statut !== 'en_attente', 422, 'Cette demande a deja ete traitee.');

        $admin = $request->user();
        abort_unless($admin instanceof User, 403);

        DB::transaction(function () use ($admin, $registrationRequest, $validated): void {
            $registrationRequest->update([
                'statut' => $validated['action'] === 'approve' ? 'validee' : 'refusee',
                'admin_email' => $admin->email,
                'commentaire_admin' => $validated['commentaire'] ?? null,
                'processed_at' => now(),
            ]);

            if ($validated['action'] === 'approve') {
                User::query()->create([
                    'nom' => $registrationRequest->nom,
                    'email' => $registrationRequest->email,
                    'email_responsable' => $registrationRequest->email_responsable,
                    'role' => 'Employe',
                    'matricule' => $registrationRequest->matricule,
                    'departement' => $registrationRequest->departement,
                    'active' => true,
                    'password' => Hash::make($registrationRequest->requested_password),
                ]);

                $registrationRequest->update([
                    'access_file_path' => null,
                    'access_file_sent_at' => now(),
                ]);

                $this->notificationService->send(
                    $registrationRequest->email,
                    'registration_approved',
                    'Lien de connexion',
                    $this->registrationAccessFileService->buildApprovedMessage($registrationRequest, $admin),
                    ['registration_request_id' => $registrationRequest->id],
                    null,
                    null,
                    true
                );

                return;
            }

            $this->notificationService->send(
                $registrationRequest->email,
                'registration_refused',
                'Inscription refusee',
                $registrationRequest->commentaire_admin ?: 'Votre demande a ete refusee par l administrateur.',
                ['registration_request_id' => $registrationRequest->id],
                null,
                null,
                true
            );
        });

        return response()->json([
            'message' => $validated['action'] === 'approve'
                ? 'Demande validee et email de connexion envoye.'
                : 'Demande refusee et email de refus envoye.',
            'request' => $registrationRequest->fresh(['admin:id,email,nom', 'manager:id,email,nom']),
        ]);
    }

    public function sendAccessFile(Request $request, RegistrationRequest $registrationRequest): JsonResponse
    {
        abort_if($registrationRequest->statut !== 'validee', 422, 'La demande doit etre validee avant envoi.');

        $admin = $request->user();
        abort_unless($admin instanceof User, 403);

        try {
            $registrationRequest->update([
                'admin_email' => $admin->email,
                'access_file_path' => null,
            ]);

            $this->notificationService->send(
                $registrationRequest->email,
                'registration_approved',
                'Lien de connexion',
                $this->registrationAccessFileService->buildApprovedMessage($registrationRequest, $admin),
                ['registration_request_id' => $registrationRequest->id],
                null,
                null,
                true
            );

            $registrationRequest->update([
                'access_file_sent_at' => now(),
            ]);

            return response()->json([
                'message' => 'Email envoye avec succes.',
                'request' => $registrationRequest->fresh(['admin:id,email,nom', 'manager:id,email,nom']),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Envoi email inscription echoue', [
                'registration_request_id' => $registrationRequest->id,
                'email' => $registrationRequest->email,
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => "L'envoi de l'email a echoue. Verifiez l'expediteur Brevo/SMTP et les logs backend.",
                'error' => $exception->getMessage(),
            ], 422);
        }
    }
}
