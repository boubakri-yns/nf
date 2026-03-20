<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NoteDeFrais extends Model
{
    use HasFactory;

    protected $table = 'notes_de_frais';

    protected $fillable = [
        'titre_mission',
        'matricule_employe',
        'date_creation',
        'total_note',
        'statut',
        'email_employe',
        'email_responsable',
        'commentaire_employe',
        'date_soumission',
        'date_validation_manager',
        'date_remboursement',
        'mode_remboursement',
        'reference_comptable',
        'paiement_effectue_le',
        'litige_commentaire',
        'document_remboursement_path',
        'archived_at',
    ];

    protected $casts = [
        'date_creation' => 'date',
        'total_note' => 'decimal:2',
        'date_soumission' => 'datetime',
        'date_validation_manager' => 'datetime',
        'date_remboursement' => 'datetime',
        'paiement_effectue_le' => 'date',
        'archived_at' => 'datetime',
    ];

    public function employe(): BelongsTo
    {
        return $this->belongsTo(User::class, 'email_employe', 'email');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'email_responsable', 'email');
    }

    public function lignesDepense(): HasMany
    {
        return $this->hasMany(LigneDepense::class, 'note_de_frais_id');
    }

    public function historique(): HasMany
    {
        return $this->hasMany(HistoriqueApprobation::class, 'note_de_frais_id');
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if (in_array($user->role, ['RH', 'Admin'], true)) {
            return $query;
        }

        if ($user->role === 'Employe') {
            return $query->where('email_employe', $user->email);
        }

        if ($user->role === 'Manager') {
            return $query->where(function (Builder $inner) use ($user): void {
                $inner
                    ->where('email_responsable', $user->email)
                    ->orWhereHas('employe', fn (Builder $employee) => $employee->where('email_responsable', $user->email));
            });
        }

        return $query->whereRaw('1 = 0');
    }

    public function isVisibleTo(User $user): bool
    {
        if (in_array($user->role, ['RH', 'Admin'], true)) {
            return true;
        }

        if ($user->role === 'Employe') {
            return $this->email_employe === $user->email;
        }

        if ($user->role === 'Manager') {
            return $this->email_responsable === $user->email
                || $this->employe?->email_responsable === $user->email;
        }

        return false;
    }
}
