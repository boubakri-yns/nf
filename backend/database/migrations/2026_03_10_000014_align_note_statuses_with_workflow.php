<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('notes_de_frais', 'archived_at')) {
            Schema::table('notes_de_frais', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->after('litige_commentaire');
            });
        }

        DB::table('notes_de_frais')->where('statut', 'valide_manager')->update(['statut' => 'en_attente_rh']);
        DB::table('notes_de_frais')->where('statut', 'valide_rh')->update(['statut' => 'valide_paiement']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE notes_de_frais
                MODIFY statut ENUM(
                    'brouillon',
                    'en_attente_responsable',
                    'en_attente_rh',
                    'valide_paiement',
                    'refuse',
                    'rembourse',
                    'a_corriger'
                ) NOT NULL DEFAULT 'brouillon'
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE notes_de_frais
                MODIFY statut ENUM(
                    'brouillon',
                    'en_attente_responsable',
                    'valide_manager',
                    'valide_rh',
                    'refuse',
                    'rembourse',
                    'a_corriger'
                ) NOT NULL DEFAULT 'brouillon'
            ");
        }

        DB::table('notes_de_frais')->where('statut', 'en_attente_rh')->update(['statut' => 'valide_manager']);
        DB::table('notes_de_frais')->where('statut', 'valide_paiement')->update(['statut' => 'valide_rh']);

        if (Schema::hasColumn('notes_de_frais', 'archived_at')) {
            Schema::table('notes_de_frais', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }
    }
};
