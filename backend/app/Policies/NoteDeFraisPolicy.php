<?php

namespace App\Policies;

use App\Models\NoteDeFrais;
use App\Models\User;

class NoteDeFraisPolicy
{
    public function view(User $user, NoteDeFrais $note): bool
    {
        $note->loadMissing('employe:id,email,email_responsable');

        return $note->isVisibleTo($user);
    }

    public function update(User $user, NoteDeFrais $note): bool
    {
        if ($user->role === 'Employe' && $note->email_employe === $user->email) {
            return in_array($note->statut, ['brouillon', 'a_corriger'], true);
        }

        return false;
    }

    public function validateAsManager(User $user, NoteDeFrais $note): bool
    {
        $note->loadMissing('employe:id,email,email_responsable');

        return $user->role === 'Manager'
            && $note->isVisibleTo($user)
            && $note->statut === 'en_attente_responsable';
    }

    public function validateAsRh(User $user, NoteDeFrais $note): bool
    {
        return $user->role === 'RH' && in_array($note->statut, ['en_attente_rh', 'valide_manager'], true);
    }
}
