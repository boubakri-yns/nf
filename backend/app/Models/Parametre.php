<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Parametre extends Model
{
    use HasFactory;

    protected $table = 'parametres';

    protected $fillable = ['cle', 'valeur', 'type', 'description'];

    public function castedValue(): bool|int|float|string
    {
        return match ($this->type) {
            'boolean' => filter_var($this->valeur, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $this->valeur,
            'decimal' => (float) $this->valeur,
            default => $this->valeur,
        };
    }
}
