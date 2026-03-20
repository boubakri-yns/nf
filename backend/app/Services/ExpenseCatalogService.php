<?php

namespace App\Services;

use App\Models\CategorieDepense;
use App\Models\Parametre;

class ExpenseCatalogService
{
    public function ensureDefaults(): void
    {
        foreach ($this->defaultCategories() as $category) {
            CategorieDepense::query()->firstOrCreate(
                ['code' => $category['code']],
                $category
            );
        }

        foreach ($this->defaultParameters() as $parameter) {
            Parametre::query()->firstOrCreate(
                ['cle' => $parameter['cle']],
                $parameter
            );
        }
    }

    private function defaultCategories(): array
    {
        return [
            ['nom' => 'Transport', 'code' => 'TRANSPORT', 'plafond_journalier' => 250, 'justificatif_obligatoire' => true, 'active' => true],
            ['nom' => 'Hebergement', 'code' => 'HEBERGEMENT', 'plafond_journalier' => 300, 'justificatif_obligatoire' => true, 'active' => true],
            ['nom' => 'Restauration', 'code' => 'RESTAURATION', 'plafond_journalier' => 80, 'justificatif_obligatoire' => false, 'active' => true],
            ['nom' => 'Autres', 'code' => 'AUTRES', 'plafond_journalier' => null, 'justificatif_obligatoire' => false, 'active' => true],
        ];
    }

    private function defaultParameters(): array
    {
        return [
            [
                'cle' => 'SEUIL_JUSTIFICATIF',
                'valeur' => '50',
                'type' => 'decimal',
                'description' => 'Montant a partir duquel le justificatif est obligatoire',
            ],
        ];
    }
}
