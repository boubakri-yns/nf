<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->string('document_remboursement_path')->nullable()->after('litige_commentaire');
        });
    }

    public function down(): void
    {
        Schema::table('notes_de_frais', function (Blueprint $table) {
            $table->dropColumn('document_remboursement_path');
        });
    }
};
