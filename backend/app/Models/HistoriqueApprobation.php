<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoriqueApprobation extends Model
{
    use HasFactory;

    protected $table = 'historique_approbations';

    protected $fillable = [
        'note_de_frais_id',
        'validateur_email',
        'action',
        'date_decision',
        'commentaire',
    ];

    protected $casts = [
        'date_decision' => 'datetime',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(NoteDeFrais::class, 'note_de_frais_id');
    }

    public function validateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validateur_email', 'email');
    }
}
