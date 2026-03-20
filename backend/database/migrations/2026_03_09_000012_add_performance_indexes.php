<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->index(['email_responsable', 'statut', 'created_at'], 'notes_responsable_statut_created_idx');
            $table->index(['email_employe', 'created_at'], 'notes_employe_created_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_email', 'created_at'], 'notifications_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->dropIndex('notes_responsable_statut_created_idx');
            $table->dropIndex('notes_employe_created_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_created_idx');
        });
    }
};
