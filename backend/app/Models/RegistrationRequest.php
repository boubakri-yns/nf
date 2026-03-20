<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistrationRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'email',
        'email_responsable',
        'matricule',
        'departement',
        'requested_password',
        'requested_role',
        'statut',
        'admin_email',
        'commentaire_admin',
        'access_file_path',
        'access_file_sent_at',
        'processed_at',
    ];

    protected $hidden = [
        'requested_password',
    ];

    protected $casts = [
        'access_file_sent_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_email', 'email');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'email_responsable', 'email');
    }
}
