<?php

namespace Tests\Feature;

use App\Models\CategorieDepense;
use App\Models\LigneDepense;
use App\Models\NoteDeFrais;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RapportBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_rh_can_generate_report_preview_with_selected_columns(): void
    {
        $this->seedReportData();
        $rh = User::query()->where('role', 'RH')->firstOrFail();

        $response = $this->actingAs($rh)->postJson('/api/rapports/generer', [
            'start_date' => now()->subMonths(3)->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'columns' => ['employee_name', 'mission_title', 'amount_total', 'status_current'],
            'filters' => [
                'statuses' => ['rembourse', 'en_attente_rh'],
                'department' => 'Technique',
            ],
            'sort_by' => 'mission_created_at',
            'sort_direction' => 'desc',
            'include_charts' => true,
            'page' => 1,
            'per_page' => 20,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('columns.0.key', 'employee_name')
            ->assertJsonStructure([
                'columns',
                'rows',
                'summary' => ['count', 'total_amount', 'average_amount', 'reimbursed_count', 'pending_count'],
                'charts' => ['categories', 'months'],
                'meta' => ['page', 'per_page', 'total', 'total_pages'],
            ]);
    }

    public function test_admin_can_save_and_list_report_configuration(): void
    {
        $this->seedReportData();
        $admin = User::query()->where('role', 'Admin')->firstOrFail();

        $this->actingAs($admin)
            ->postJson('/api/rapports/sauvegarder', [
                'nom' => 'Modele RH mensuel',
                'description' => 'Suivi des remboursements',
                'configuration' => [
                    'start_date' => now()->subMonths(2)->toDateString(),
                    'end_date' => now()->toDateString(),
                    'columns' => ['employee_name', 'amount_total'],
                    'filters' => ['statuses' => ['rembourse'], 'department' => '', 'manager' => '', 'employee' => '', 'amount_min' => '', 'amount_max' => '', 'note_ids' => []],
                    'sort_by' => 'amount_total',
                    'sort_direction' => 'desc',
                    'include_charts' => true,
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('nom', 'Modele RH mensuel');

        $this->actingAs($admin)
            ->getJson('/api/rapports/configurations')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.nom', 'Modele RH mensuel');
    }

    public function test_rh_can_export_dynamic_report_as_csv(): void
    {
        $this->seedReportData();
        $rh = User::query()->where('role', 'RH')->firstOrFail();

        $response = $this->actingAs($rh)->post('/api/rapports/generer', [
            'start_date' => now()->subMonths(3)->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
            'columns' => ['employee_name', 'mission_title', 'amount_total'],
            'filters' => [],
            'sort_by' => 'mission_created_at',
            'sort_direction' => 'desc',
            'format' => 'csv',
            'include_charts' => false,
        ]);

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('content-type') ?? '');
    }

    private function seedReportData(): void
    {
        $admin = $this->makeUser([
            'email' => 'admin@example.com',
            'role' => 'Admin',
            'matricule' => 'ADM001',
            'departement' => 'Administration',
        ]);

        $rh = $this->makeUser([
            'email' => 'rh@example.com',
            'role' => 'RH',
            'matricule' => 'RH001',
            'departement' => 'Ressources Humaines',
        ]);

        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
            'departement' => 'Technique',
            'email_responsable' => $rh->email,
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'departement' => 'Technique',
            'email_responsable' => $manager->email,
        ]);

        $transport = CategorieDepense::query()->create([
            'nom' => 'Transport',
            'code' => 'TRANSPORT',
            'plafond_journalier' => 250,
            'justificatif_obligatoire' => true,
            'active' => true,
        ]);

        foreach (range(1, 4) as $index) {
            $status = $index % 2 === 0 ? 'rembourse' : 'en_attente_rh';
            $note = NoteDeFrais::query()->create([
                'titre_mission' => 'Mission '.$index,
                'matricule_employe' => $employee->matricule,
                'date_creation' => now()->subDays($index * 6)->toDateString(),
                'total_note' => 100 + ($index * 25),
                'statut' => $status,
                'email_employe' => $employee->email,
                'email_responsable' => $manager->email,
                'commentaire_employe' => 'Rapport test',
                'date_soumission' => now()->subDays($index * 6 - 1),
                'date_validation_manager' => now()->subDays($index * 6 - 2),
                'date_remboursement' => $status === 'rembourse' ? now()->subDays($index * 6 - 4) : null,
                'reference_comptable' => $status === 'rembourse' ? 'REF-00'.$index : null,
            ]);

            LigneDepense::query()->create([
                'note_de_frais_id' => $note->id,
                'categorie_id' => $transport->id,
                'date_depense' => now()->subDays($index * 6)->toDateString(),
                'montant' => 100 + ($index * 25),
                'commentaire' => 'Train',
            ]);
        }
    }

    private function makeUser(array $overrides): User
    {
        return User::query()->create([
            'nom' => $overrides['nom'] ?? 'Utilisateur Test',
            'email' => $overrides['email'],
            'email_responsable' => $overrides['email_responsable'] ?? null,
            'role' => $overrides['role'],
            'matricule' => $overrides['matricule'],
            'departement' => $overrides['departement'] ?? 'Finance',
            'password' => Hash::make('password'),
            'active' => true,
        ]);
    }
}
