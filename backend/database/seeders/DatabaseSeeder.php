<?php

namespace Database\Seeders;

use App\Models\CategorieDepense;
use App\Models\HistoriqueApprobation;
use App\Models\LigneDepense;
use App\Models\NoteDeFrais;
use App\Models\Parametre;
use App\Models\RegistrationRequest;
use App\Models\User;
use App\Services\DemoAccountsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUsers();
        $this->seedCategories();
        $this->seedParametres();
        $this->seedNotes();
    }

    private function seedUsers(): void
    {
        app(DemoAccountsService::class)->restore();

        RegistrationRequest::query()
            ->where('statut', 'validee')
            ->orderBy('id')
            ->get()
            ->each(function (RegistrationRequest $request): void {
                User::query()->updateOrCreate(
                    ['email' => $request->email],
                    [
                        'nom' => $request->nom,
                        'email_responsable' => $request->email_responsable,
                        'role' => 'Employe',
                        'matricule' => $request->matricule,
                        'departement' => $request->departement,
                        'password' => Hash::make($request->requested_password),
                        'active' => true,
                    ]
                );
            });
    }

    private function seedCategories(): void
    {
        $categories = [
            ['nom' => 'Transport', 'code' => 'TRANSPORT', 'plafond_journalier' => 250, 'justificatif_obligatoire' => true, 'active' => true],
            ['nom' => 'Hebergement', 'code' => 'HEBERGEMENT', 'plafond_journalier' => 300, 'justificatif_obligatoire' => true, 'active' => true],
            ['nom' => 'Restauration', 'code' => 'RESTAURATION', 'plafond_journalier' => 80, 'justificatif_obligatoire' => false, 'active' => true],
            ['nom' => 'Autres', 'code' => 'AUTRES', 'plafond_journalier' => null, 'justificatif_obligatoire' => false, 'active' => true],
        ];

        foreach ($categories as $categorie) {
            CategorieDepense::query()->updateOrCreate(['code' => $categorie['code']], $categorie);
        }
    }

    private function seedParametres(): void
    {
        $params = [
            [
                'cle' => 'SEUIL_JUSTIFICATIF',
                'valeur' => '50',
                'type' => 'decimal',
                'description' => 'Montant a partir duquel le justificatif est obligatoire',
            ],
            [
                'cle' => 'SEUIL_VALIDATION_SUPPLEMENTAIRE',
                'valeur' => '500',
                'type' => 'decimal',
                'description' => 'Montant declenchant une validation additionnelle',
            ],
            [
                'cle' => 'DELAI_REMBOURSEMENT_JOURS',
                'valeur' => '15',
                'type' => 'integer',
                'description' => 'Delai cible de remboursement en jours',
            ],
        ];

        foreach ($params as $param) {
            Parametre::query()->updateOrCreate(['cle' => $param['cle']], $param);
        }
    }

    private function seedNotes(): void
    {
        NoteDeFrais::query()->delete();
    }
}
