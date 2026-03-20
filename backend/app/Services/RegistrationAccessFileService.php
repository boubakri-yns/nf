<?php

namespace App\Services;

use App\Models\RegistrationRequest;
use App\Models\User;

class RegistrationAccessFileService
{
    public function buildLoginUrl(RegistrationRequest $request): string
    {
        $frontendUrl = rtrim((string) config('services.frontend_url', 'http://localhost:5173'), '/');

        return $frontendUrl.'/login?email='.urlencode($request->email);
    }

    public function buildApprovedMessage(RegistrationRequest $request, User $admin): string
    {
        $lines = [
            'Bonjour '.$request->nom.',',
            '',
            'Votre demande a ete validee par l administrateur '.$admin->nom.'.',
            'Vous pouvez maintenant vous connecter depuis le lien ci-dessous :',
            '',
            $this->buildLoginUrl($request),
            '',
            'Votre adresse email sera deja renseignee.',
            'Il vous restera uniquement a saisir le mot de passe choisi lors de votre inscription.',
        ];

        return implode(PHP_EOL, $lines).PHP_EOL;
    }
}
