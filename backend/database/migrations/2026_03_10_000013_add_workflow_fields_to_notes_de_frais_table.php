<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->timestamp('date_soumission')->nullable()->after('commentaire_employe');
            $table->timestamp('date_validation_manager')->nullable()->after('date_soumission');
            $table->timestamp('date_remboursement')->nullable()->after('date_validation_manager');
            $table->string('mode_remboursement')->nullable()->after('date_remboursement');
            $table->string('reference_comptable')->nullable()->after('mode_remboursement');
            $table->date('paiement_effectue_le')->nullable()->after('reference_comptable');
            $table->text('litige_commentaire')->nullable()->after('paiement_effectue_le');
        });
    }

    public function down(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->dropColumn([
                'date_soumission',
                'date_validation_manager',
                'date_remboursement',
                'mode_remboursement',
                'reference_comptable',
                'paiement_effectue_le',
                'litige_commentaire',
            ]);
        });
    }
};
