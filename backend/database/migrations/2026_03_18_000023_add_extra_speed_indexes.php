<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->index(['statut', 'date_validation_manager'], 'notes_statut_validation_idx');
            $table->index(['date_creation', 'statut'], 'notes_creation_statut_idx');
            $table->index('email_responsable', 'notes_email_responsable_idx');
            $table->index('email_employe', 'notes_email_employe_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_email', 'est_lue', 'created_at'], 'notifications_user_read_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->dropIndex('notes_statut_validation_idx');
            $table->dropIndex('notes_creation_statut_idx');
            $table->dropIndex('notes_email_responsable_idx');
            $table->dropIndex('notes_email_employe_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_created_idx');
        });
    }
};
