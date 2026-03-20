<?php

use App\Services\DemoAccountsService;
use Illuminate\Support\Facades\Artisan;

Artisan::command('demo:restore-users', function (DemoAccountsService $demoAccounts): void {
    $count = $demoAccounts->restore();

    $this->info("{$count} comptes de demonstration ont ete restaures.");
    $this->info('Mot de passe pour tous les comptes: Password123!');
})->purpose('Restore demo users and reset their passwords');
