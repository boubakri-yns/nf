<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nom',
        'email',
        'email_responsable',
        'role',
        'matricule',
        'departement',
        'active',
        'password',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function notesCrees(): HasMany
    {
        return $this->hasMany(NoteDeFrais::class, 'email_employe', 'email');
    }

    public function notesAValider(): HasMany
    {
        return $this->hasMany(NoteDeFrais::class, 'email_responsable', 'email');
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(self::class, 'email_responsable', 'email');
    }

    public function collaborateurs(): HasMany
    {
        return $this->hasMany(self::class, 'email_responsable', 'email');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_email', 'email');
    }

    public function registrationRequestsToApprove(): HasMany
    {
        return $this->hasMany(RegistrationRequest::class, 'admin_email', 'email');
    }

    public function isRole(string $role): bool
    {
        return $this->role === $role;
    }
}
