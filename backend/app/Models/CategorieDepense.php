<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategorieDepense extends Model
{
    use HasFactory;

    protected $table = 'categories_depense';

    protected $fillable = [
        'nom',
        'code',
        'plafond_journalier',
        'justificatif_obligatoire',
        'active',
    ];

    protected $casts = [
        'plafond_journalier' => 'decimal:2',
        'justificatif_obligatoire' => 'boolean',
        'active' => 'boolean',
    ];

    public function lignesDepense(): HasMany
    {
        return $this->hasMany(LigneDepense::class, 'categorie_id');
    }
}
