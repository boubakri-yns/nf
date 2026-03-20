<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login(): void
    {
        $user = User::query()->create([
            'nom' => 'Utilisateur Test',
            'email' => 'test@example.com',
            'email_responsable' => null,
            'role' => 'Employe',
            'matricule' => 'EMP9999',
            'departement' => 'IT',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['user', 'token']);
    }

    public function test_all_seeded_demo_accounts_can_login(): void
    {
        $this->seed(DatabaseSeeder::class);

        $accounts = [
            ['email' => 'admin.app@nf.com', 'role' => 'Admin'],
            ['email' => 'rh.app@nf.com', 'role' => 'RH'],
            ['email' => 'manager1.app@nf.com', 'role' => 'Manager'],
            ['email' => 'vaticanbaba@gmail.com', 'role' => 'Employe'],
        ];

        foreach ($accounts as $account) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $account['email'],
                'password' => 'Password123!',
            ]);

            $response
                ->assertStatus(200)
                ->assertJsonPath('user.email', $account['email'])
                ->assertJsonPath('user.role', $account['role'])
                ->assertJsonStructure(['user', 'token']);
        }
    }
}
