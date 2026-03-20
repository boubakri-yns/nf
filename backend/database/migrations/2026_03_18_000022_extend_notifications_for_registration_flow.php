<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE notifications MODIFY type ENUM('note_soumise', 'note_approuvee', 'note_refusee', 'note_correction', 'note_remboursee', 'registration_request', 'registration_approved', 'registration_refused') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE notifications MODIFY type ENUM('note_soumise', 'note_approuvee', 'note_refusee', 'note_correction', 'note_remboursee') NOT NULL");
    }
};
