<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('user_email');
            $table->enum('type', ['note_soumise', 'note_approuvee', 'note_refusee', 'note_correction', 'note_remboursee']);
            $table->string('titre');
            $table->text('message');
            $table->json('data')->nullable();
            $table->boolean('est_lue')->default(false);
            $table->timestamp('email_envoye_le')->nullable();
            $table->timestamps();

            $table->foreign('user_email')->references('email')->on('users')->cascadeOnDelete();
            $table->index(['user_email', 'est_lue']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
