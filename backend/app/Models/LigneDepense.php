<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneDepense extends Model
{
    use HasFactory;

    protected $table = 'lignes_depense';

    protected $fillable = [
        'note_de_frais_id',
        'categorie_id',
        'date_depense',
        'montant',
        'justificatif_path',
        'commentaire',
    ];

    protected $casts = [
        'date_depense' => 'date',
        'montant' => 'decimal:2',
    ];

    public function note(): BelongsTo
    {
        return $this->belongsTo(NoteDeFrais::class, 'note_de_frais_id');
    }

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(CategorieDepense::class, 'categorie_id');
    }
}
