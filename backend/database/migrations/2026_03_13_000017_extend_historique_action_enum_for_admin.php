<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement(
            "ALTER TABLE historique_approbations MODIFY action ENUM(
                'approuve_manager',
                'approuve_rh',
                'refuse',
                'demande_correction',
                'rembourse',
                'archiver',
                'admin_update',
                'admin_force_status',
                'admin_expense_add',
                'admin_expense_update',
                'admin_expense_delete',
                'admin_receipt_delete'
            ) NOT NULL"
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement(
            "ALTER TABLE historique_approbations MODIFY action ENUM(
                'approuve_manager',
                'approuve_rh',
                'refuse',
                'demande_correction',
                'rembourse'
            ) NOT NULL"
        );
    }
};
