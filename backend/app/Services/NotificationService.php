<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class NotificationService
{
    public function send(
        string $userEmail,
        string $type,
        string $titre,
        string $message,
        ?array $data = null,
        ?string $attachmentPath = null,
        ?string $attachmentName = null,
        bool $throwOnFailure = false
    ): Notification {
        $userExists = User::query()->where('email', $userEmail)->exists();

        $notification = new Notification([
            'user_email' => $userExists ? $userEmail : null,
            'type' => $type,
            'titre' => $titre,
            'message' => $message,
            'data' => $data,
        ]);

        if ($userExists) {
            $notification = Notification::query()->create($notification->getAttributes());
        } else {
            Log::info('Notification email envoyee sans enregistrement en base, utilisateur absent', [
                'user_email' => $userEmail,
                'type' => $type,
            ]);
        }

        try {
            $this->deliver($userEmail, $titre, $message, $attachmentPath, $attachmentName);

            if ($notification->exists) {
                $notification->update(['email_envoye_le' => now()]);
            }
        } catch (\Throwable $exception) {
            Log::warning('Envoi email notification echoue', [
                'notification_id' => $notification->exists ? $notification->id : null,
                'user_email' => $userEmail,
                'type' => $type,
                'error' => $exception->getMessage(),
            ]);

            if ($throwOnFailure) {
                throw $exception;
            }
        }

        return $notification;
    }

    private function deliver(
        string $userEmail,
        string $titre,
        string $message,
        ?string $attachmentPath,
        ?string $attachmentName
    ): void {
        $brevoApiKey = (string) config('services.brevo.api_key');

        if ($brevoApiKey !== '') {
            try {
                $this->sendWithBrevoApi($brevoApiKey, $userEmail, $titre, $message, $attachmentPath, $attachmentName);
                return;
            } catch (\Throwable $exception) {
                Log::warning('Envoi Brevo echoue, tentative de fallback mailer', [
                    'user_email' => $userEmail,
                    'error' => $exception->getMessage(),
                ]);

                if ((string) config('mail.default') === 'log') {
                    throw $exception;
                }
            }
        }

        Mail::raw($message, function ($mail) use ($attachmentName, $attachmentPath, $titre, $userEmail): void {
            $mail->to($userEmail)->subject($titre);

            if ($attachmentPath) {
                $disk = config('filesystems.default', 'public');

                if (Storage::disk($disk)->exists($attachmentPath)) {
                    $mail->attach(
                        Storage::disk($disk)->path($attachmentPath),
                        ['as' => $attachmentName ?? basename($attachmentPath)]
                    );
                }
            }
        });
    }

    private function sendWithBrevoApi(
        string $apiKey,
        string $userEmail,
        string $titre,
        string $message,
        ?string $attachmentPath,
        ?string $attachmentName
    ): void {
        $senderEmail = (string) config('services.brevo.sender_email');
        $senderName = (string) config('services.brevo.sender_name', 'Nexans Notes de Frais');

        if ($senderEmail === '') {
            throw new \RuntimeException('BREVO sender email is missing.');
        }

        $payload = [
            'sender' => [
                'name' => $senderName,
                'email' => $senderEmail,
            ],
            'to' => [
                ['email' => $userEmail],
            ],
            'subject' => $titre,
            'textContent' => $message,
        ];

        $attachment = $this->makeBrevoAttachment($attachmentPath, $attachmentName);
        if ($attachment !== null) {
            $payload['attachment'] = [$attachment];
        }

        $headers = ['api-key' => $apiKey];
        if ((bool) config('services.brevo.sandbox', false)) {
            $headers['x-sib-sandbox'] = 'drop';
        }

        Http::baseUrl((string) config('services.brevo.base_url', 'https://api.brevo.com/v3'))
            ->timeout(30)
            ->acceptJson()
            ->withHeaders($headers)
            ->post('/smtp/email', $payload)
            ->throw();
    }

    private function makeBrevoAttachment(?string $attachmentPath, ?string $attachmentName): ?array
    {
        if (! $attachmentPath) {
            return null;
        }

        $disk = config('filesystems.default', 'public');
        if (! Storage::disk($disk)->exists($attachmentPath)) {
            return null;
        }

        return [
            'name' => $attachmentName ?? basename($attachmentPath),
            'content' => base64_encode(Storage::disk($disk)->get($attachmentPath)),
        ];
    }
}
