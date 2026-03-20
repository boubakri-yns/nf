<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('registration_requests', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('email')->unique();
            $table->string('email_responsable');
            $table->string('matricule')->unique();
            $table->string('departement')->nullable();
            $table->string('requested_password');
            $table->enum('requested_role', ['Employe'])->default('Employe');
            $table->enum('statut', ['en_attente', 'validee', 'refusee'])->default('en_attente');
            $table->string('admin_email')->nullable();
            $table->text('commentaire_admin')->nullable();
            $table->string('access_file_path')->nullable();
            $table->timestamp('access_file_sent_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->foreign('email_responsable')->references('email')->on('users')->cascadeOnDelete();
            $table->foreign('admin_email')->references('email')->on('users')->nullOnDelete();
            $table->index(['statut', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_requests');
    }
};
