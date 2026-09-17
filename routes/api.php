<?php

use App\Http\Controllers\Api\ExampleController;
use Illuminate\Support\Facades\Route;

Route::get('example', [ExampleController::class, 'show'])->name('api.example');
