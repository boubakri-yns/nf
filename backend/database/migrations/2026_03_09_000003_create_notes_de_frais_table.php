<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notes_de_frais', function (Blueprint $table) {
            $table->id();
            $table->string('titre_mission');
            $table->string('matricule_employe');
            $table->date('date_creation');
            $table->decimal('total_note', 10, 2)->default(0);
            $table->enum('statut', [
                'brouillon',
                'en_attente_responsable',
                'en_attente_rh',
                'valide_paiement',
                'refuse',
                'rembourse',
                'a_corriger',
            ])->default('brouillon');
            $table->string('email_employe');
            $table->string('email_responsable');
            $table->text('commentaire_employe')->nullable();
            $table->timestamps();

            $table->foreign('email_employe')->references('email')->on('users')->cascadeOnDelete();
            $table->foreign('email_responsable')->references('email')->on('users')->restrictOnDelete();
            $table->index(['email_employe', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes_de_frais');
    }
};
