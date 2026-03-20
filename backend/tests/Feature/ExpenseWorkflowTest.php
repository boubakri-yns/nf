<?php

namespace Tests\Feature;

use App\Models\CategorieDepense;
use App\Models\LigneDepense;
use App\Models\NoteDeFrais;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_rh_can_mark_manager_validated_note_as_reimbursed(): void
    {
        Storage::fake('public');

        $rh = $this->makeUser([
            'email' => 'rh@example.com',
            'role' => 'RH',
            'matricule' => 'RH001',
        ]);

        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'email_responsable' => $manager->email,
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => 'Mission client',
            'matricule_employe' => $employee->matricule,
            'date_creation' => now()->toDateString(),
            'total_note' => 120,
            'statut' => 'en_attente_rh',
            'email_employe' => $employee->email,
            'email_responsable' => $manager->email,
        ]);

        $this->actingAs($rh)
            ->postJson("/api/notes-de-frais/{$note->id}/changer-statut", [
                'action' => 'rembourse',
                'mode_remboursement' => 'virement_salaire',
            ])
            ->assertOk()
            ->assertJsonPath('statut', 'rembourse')
            ->assertJsonPath('mode_remboursement', 'virement_salaire');

        $note->refresh();

        $this->assertNotNull($note->reference_comptable);
        $this->assertNotNull($note->document_remboursement_path);
        Storage::disk('public')->assertExists($note->document_remboursement_path);
        $this->assertDatabaseHas('notifications', [
            'user_email' => $employee->email,
            'type' => 'note_remboursee',
        ]);
    }

    public function test_authorized_actor_can_download_reimbursement_document(): void
    {
        Storage::fake('public');

        $rh = $this->makeUser([
            'email' => 'rh@example.com',
            'role' => 'RH',
            'matricule' => 'RH001',
        ]);

        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'email_responsable' => $manager->email,
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => 'Mission client',
            'matricule_employe' => $employee->matricule,
            'date_creation' => now()->toDateString(),
            'total_note' => 120,
            'statut' => 'rembourse',
            'email_employe' => $employee->email,
            'email_responsable' => $manager->email,
            'reference_comptable' => 'REF-20260312-0001',
            'mode_remboursement' => 'virement_salaire',
            'paiement_effectue_le' => now()->toDateString(),
            'document_remboursement_path' => 'remboursements/test-note.txt',
        ]);

        Storage::disk('public')->put($note->document_remboursement_path, 'document');

        $this->actingAs($employee)
            ->get("/api/notes-de-frais/{$note->id}/document-remboursement")
            ->assertOk();
    }

    public function test_authorized_user_can_download_expense_receipt(): void
    {
        Storage::fake('public');

        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'email_responsable' => $manager->email,
        ]);

        $category = CategorieDepense::query()->create([
            'nom' => 'Transport',
            'code' => 'TRANSPORT',
            'plafond_journalier' => 200,
            'justificatif_obligatoire' => true,
            'active' => true,
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => 'Mission client',
            'matricule_employe' => $employee->matricule,
            'date_creation' => now()->toDateString(),
            'total_note' => 45,
            'statut' => 'en_attente_responsable',
            'email_employe' => $employee->email,
            'email_responsable' => $manager->email,
        ]);

        $path = UploadedFile::fake()->create('ticket.pdf', 32, 'application/pdf')->store('justificatifs', 'public');

        $ligne = LigneDepense::query()->create([
            'note_de_frais_id' => $note->id,
            'categorie_id' => $category->id,
            'date_depense' => now()->toDateString(),
            'montant' => 45,
            'justificatif_path' => $path,
            'commentaire' => 'Taxi aeroport',
        ]);

        $this->actingAs($manager)
            ->get("/api/lignes-depense/{$ligne->id}/justificatif")
            ->assertOk();
    }

    public function test_manager_can_refuse_note_pending_manager_review(): void
    {
        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'email_responsable' => $manager->email,
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => 'Mission client',
            'matricule_employe' => $employee->matricule,
            'date_creation' => now()->toDateString(),
            'total_note' => 120,
            'statut' => 'en_attente_responsable',
            'email_employe' => $employee->email,
            'email_responsable' => $manager->email,
        ]);

        $this->actingAs($manager)
            ->postJson("/api/notes-de-frais/{$note->id}/changer-statut", [
                'action' => 'refuse',
                'commentaire' => 'Montant non conforme',
            ])
            ->assertOk()
            ->assertJsonPath('statut', 'refuse');
    }

    public function test_employee_can_change_brouillon_note_to_en_attente_responsable_from_update(): void
    {
        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'email_responsable' => $manager->email,
        ]);

        $category = CategorieDepense::query()->create([
            'nom' => 'Transport',
            'code' => 'TRANSPORT',
            'plafond_journalier' => 200,
            'justificatif_obligatoire' => false,
            'active' => true,
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => 'Mission client',
            'matricule_employe' => $employee->matricule,
            'date_creation' => now()->toDateString(),
            'total_note' => 45,
            'statut' => 'brouillon',
            'email_employe' => $employee->email,
            'email_responsable' => $manager->email,
        ]);

        LigneDepense::query()->create([
            'note_de_frais_id' => $note->id,
            'categorie_id' => $category->id,
            'date_depense' => now()->toDateString(),
            'montant' => 45,
            'commentaire' => 'Taxi',
        ]);

        $this->actingAs($employee)
            ->putJson("/api/notes-de-frais/{$note->id}", [
                'titre_mission' => 'Mission client',
                'commentaire_employe' => 'Commentaire',
                'statut' => 'en_attente_responsable',
            ])
            ->assertOk()
            ->assertJsonPath('statut', 'en_attente_responsable');
    }

    public function test_rh_refusal_notifies_manager_and_employee(): void
    {
        $rh = $this->makeUser([
            'email' => 'rh@example.com',
            'role' => 'RH',
            'matricule' => 'RH001',
        ]);

        $manager = $this->makeUser([
            'email' => 'manager@example.com',
            'role' => 'Manager',
            'matricule' => 'MGR001',
        ]);

        $employee = $this->makeUser([
            'email' => 'employee@example.com',
            'role' => 'Employe',
            'matricule' => 'EMP001',
            'email_responsable' => $manager->email,
        ]);

        $note = NoteDeFrais::query()->create([
            'titre_mission' => 'Mission client',
            'matricule_employe' => $employee->matricule,
            'date_creation' => now()->toDateString(),
            'total_note' => 120,
            'statut' => 'en_attente_rh',
            'email_employe' => $employee->email,
            'email_responsable' => $manager->email,
        ]);

        $this->actingAs($rh)
            ->postJson("/api/notes-de-frais/{$note->id}/changer-statut", [
                'action' => 'refuse',
                'commentaire' => 'Justificatif incomplet',
            ])
            ->assertOk()
            ->assertJsonPath('statut', 'refuse');

        $this->assertDatabaseHas('notifications', [
            'user_email' => $employee->email,
            'type' => 'note_refusee',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_email' => $manager->email,
            'type' => 'note_refusee',
        ]);
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
        ]);
    }
}
