<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'status' => 'ok',
    'version' => '1.0.0',
]));

Broadcast::routes(['middleware' => ['auth:sanctum']]);
