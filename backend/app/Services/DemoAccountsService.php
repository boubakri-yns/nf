<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DemoAccountsService
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function accounts(): array
    {
        return [
            [
                'nom' => 'Admin App',
                'email' => 'admin.app@nf.com',
                'email_responsable' => null,
                'role' => 'Admin',
                'matricule' => 'ADM1001',
                'departement' => 'Administration',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'RH App',
                'email' => 'rh.app@nf.com',
                'email_responsable' => null,
                'role' => 'RH',
                'matricule' => 'RH1001',
                'departement' => 'Ressources Humaines',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'Manager 1',
                'email' => 'manager1.app@nf.com',
                'email_responsable' => 'rh.app@nf.com',
                'role' => 'Manager',
                'matricule' => 'MNG1001',
                'departement' => 'Operations',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'Manager 2',
                'email' => 'manager2.app@nf.com',
                'email_responsable' => 'rh.app@nf.com',
                'role' => 'Manager',
                'matricule' => 'MNG1002',
                'departement' => 'Operations',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'Younes Boubakri',
                'email' => 'younesboubakri37@gmail.com',
                'email_responsable' => 'manager1.app@nf.com',
                'role' => 'Employe',
                'matricule' => 'EMP1001',
                'departement' => 'Technique',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'Vatican Baba',
                'email' => 'vaticanbaba@gmail.com',
                'email_responsable' => 'manager1.app@nf.com',
                'role' => 'Employe',
                'matricule' => 'EMP1002',
                'departement' => 'Technique',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'Younes Boubakri Pro',
                'email' => 'younesboubakripro@gmail.com',
                'email_responsable' => 'manager2.app@nf.com',
                'role' => 'Employe',
                'matricule' => 'EMP1003',
                'departement' => 'Operations',
                'password' => 'Password123!',
                'active' => true,
            ],
            [
                'nom' => 'Ali Khat',
                'email' => 'alikhat050@gmail.com',
                'email_responsable' => 'manager2.app@nf.com',
                'role' => 'Employe',
                'matricule' => 'EMP1004',
                'departement' => 'Operations',
                'password' => 'Password123!',
                'active' => true,
            ],
        ];
    }

    public function restore(): int
    {
        foreach ($this->accounts() as $account) {
            User::query()->updateOrCreate(
                ['email' => $account['email']],
                [
                    'nom' => $account['nom'],
                    'email_responsable' => $account['email_responsable'],
                    'role' => $account['role'],
                    'matricule' => $account['matricule'],
                    'departement' => $account['departement'],
                    'password' => Hash::make($account['password']),
                    'active' => $account['active'],
                ]
            );
        }

        return count($this->accounts());
    }
}
