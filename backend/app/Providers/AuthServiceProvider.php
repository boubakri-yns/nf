<?php

namespace App\Providers;

use App\Models\NoteDeFrais;
use App\Policies\NoteDeFraisPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        NoteDeFrais::class => NoteDeFraisPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
