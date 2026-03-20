<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('historique_approbations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_de_frais_id')->constrained('notes_de_frais')->cascadeOnDelete();
            $table->string('validateur_email');
            $table->enum('action', ['approuve_manager', 'approuve_rh', 'refuse', 'demande_correction', 'rembourse']);
            $table->dateTime('date_decision');
            $table->text('commentaire')->nullable();
            $table->timestamps();

            $table->foreign('validateur_email')->references('email')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historique_approbations');
    }
};
