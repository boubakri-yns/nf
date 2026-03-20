<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminRegistrationRequestController;
use App\Http\Controllers\Api\AdminNoteController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\CategorieDepenseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LigneDepenseController;
use App\Http\Controllers\Api\LoginAuditController;
use App\Http\Controllers\Api\ManagerUserController;
use App\Http\Controllers\Api\NoteDeFraisController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ParametreController;
use App\Http\Controllers\Api\RapportController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/user', [AuthController::class, 'user']);
        Route::get('/profile', [AuthController::class, 'user']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
    Route::get('/dashboard/rh-overview', [DashboardController::class, 'rhOverview'])->middleware('role:RH');

    Route::get('/categories-depense', [CategorieDepenseController::class, 'index']);

    Route::get('/notes-de-frais', [NoteDeFraisController::class, 'index']);
    Route::post('/notes-de-frais', [NoteDeFraisController::class, 'store'])->middleware('role:Employe');
    Route::get('/notes-de-frais/{noteDeFrai}', [NoteDeFraisController::class, 'show']);
    Route::get('/notes-de-frais/{noteDeFrai}/document-remboursement', [NoteDeFraisController::class, 'telechargerDocumentRemboursement']);
    Route::put('/notes-de-frais/{noteDeFrai}', [NoteDeFraisController::class, 'update']);
    Route::delete('/notes-de-frais/{noteDeFrai}', [NoteDeFraisController::class, 'destroy']);
    Route::post('/notes-de-frais/{noteDeFrai}/soumettre', [NoteDeFraisController::class, 'soumettre']);
    Route::post('/notes-de-frais/{noteDeFrai}/changer-statut', [NoteDeFraisController::class, 'changerStatut']);

    Route::post('/notes-de-frais/{noteDeFrai}/lignes', [LigneDepenseController::class, 'store']);
    Route::put('/lignes-depense/{ligneDepense}', [LigneDepenseController::class, 'update']);
    Route::delete('/lignes-depense/{ligneDepense}', [LigneDepenseController::class, 'destroy']);
    Route::get('/lignes-depense/{ligneDepense}/justificatif', [LigneDepenseController::class, 'telechargerJustificatif']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/apercu', [NotificationController::class, 'apercu']);
    Route::get('/notifications/non-lues', [NotificationController::class, 'nonLues']);
    Route::patch('/notifications/{notification}/lue', [NotificationController::class, 'marquerLue']);
    Route::patch('/notifications/lues/toutes', [NotificationController::class, 'marquerToutesLues']);

    Route::prefix('/rapports')->group(function (): void {
        Route::get('/mensuels', [RapportController::class, 'statistiquesMensuelles']);
        Route::get('/employes', [RapportController::class, 'parEmploye']);
        Route::get('/departements', [RapportController::class, 'parDepartement']);
        Route::get('/export', [RapportController::class, 'exportCsv']);
        Route::get('/equipe', [RapportController::class, 'equipe'])->middleware('role:Manager');
        Route::get('/globaux', [RapportController::class, 'globaux'])->middleware('role:RH,Admin');
        Route::get('/colonnes', [RapportController::class, 'colonnesDisponibles'])->middleware('role:RH,Admin');
        Route::get('/filtres', [RapportController::class, 'filtresDisponibles'])->middleware('role:RH,Admin');
        Route::post('/generer', [RapportController::class, 'generer'])->middleware('role:RH,Admin');
        Route::post('/sauvegarder', [RapportController::class, 'sauvegarderConfiguration'])->middleware('role:RH,Admin');
        Route::get('/configurations', [RapportController::class, 'configurations'])->middleware('role:RH,Admin');
        Route::delete('/configurations/{configuration}', [RapportController::class, 'supprimerConfiguration'])->middleware('role:RH,Admin');
    });

    Route::prefix('/manager')->middleware('role:Manager')->group(function (): void {
        Route::get('/users', [ManagerUserController::class, 'index']);
        Route::post('/users', [ManagerUserController::class, 'store']);
        Route::put('/users/{user}', [ManagerUserController::class, 'update']);
        Route::patch('/users/{user}/active', [ManagerUserController::class, 'toggleActive']);
    });

    Route::prefix('/admin')->middleware('role:Admin')->group(function (): void {
        Route::get('/registration-requests', [AdminRegistrationRequestController::class, 'index']);
        Route::post('/registration-requests/{registrationRequest}/decision', [AdminRegistrationRequestController::class, 'decide']);
        Route::post('/registration-requests/{registrationRequest}/send-access-file', [AdminRegistrationRequestController::class, 'sendAccessFile']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
        Route::patch('/users/{user}/active', [AdminUserController::class, 'toggleActive']);
        Route::post('/users/{user}/impersonate', [AdminUserController::class, 'impersonate']);

        Route::post('/notes-de-frais', [AdminNoteController::class, 'store']);
        Route::put('/notes-de-frais/{noteDeFrai}', [AdminNoteController::class, 'update']);
        Route::delete('/notes-de-frais/{noteDeFrai}', [AdminNoteController::class, 'destroy']);
        Route::post('/notes-de-frais/{noteDeFrai}/force-status', [AdminNoteController::class, 'forceStatus']);
        Route::post('/notes-de-frais/{noteDeFrai}/lignes', [AdminNoteController::class, 'storeExpense']);
        Route::put('/lignes-depense/{ligneDepense}', [AdminNoteController::class, 'updateExpense']);
        Route::delete('/lignes-depense/{ligneDepense}', [AdminNoteController::class, 'destroyExpense']);
        Route::delete('/lignes-depense/{ligneDepense}/justificatif', [AdminNoteController::class, 'deleteReceipt']);

        Route::post('/categories-depense', [CategorieDepenseController::class, 'store']);
        Route::put('/categories-depense/{categorieDepense}', [CategorieDepenseController::class, 'update']);
        Route::delete('/categories-depense/{categorieDepense}', [CategorieDepenseController::class, 'destroy']);

        Route::get('/parametres', [ParametreController::class, 'index']);
        Route::put('/parametres/{parametre}', [ParametreController::class, 'update']);

        Route::get('/audit-logs', [AuditController::class, 'index']);
        Route::get('/login-audits', [LoginAuditController::class, 'index']);
    });
});
