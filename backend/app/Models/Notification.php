<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_email',
        'type',
        'titre',
        'message',
        'data',
        'est_lue',
        'email_envoye_le',
    ];

    protected $casts = [
        'data' => 'array',
        'est_lue' => 'boolean',
        'email_envoye_le' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_email', 'email');
    }
}
