<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lignes_depense', function (Blueprint $table) {
            $table->id();
            $table->foreignId('note_de_frais_id')->constrained('notes_de_frais')->cascadeOnDelete();
            $table->foreignId('categorie_id')->constrained('categories_depense')->restrictOnDelete();
            $table->date('date_depense');
            $table->decimal('montant', 10, 2);
            $table->string('justificatif_path')->nullable();
            $table->text('commentaire')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_depense');
    }
};
