<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RapportConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'description',
        'configuration',
        'created_by_user_id',
    ];

    protected $casts = [
        'configuration' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
