<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;

class ManualController extends Controller
{
    /**
     * Display the SOP Manual.
     */
    public function index()
    {
        return Inertia::render('Manual/Index', [
            'appName' => config('app.name', 'Pharmacy POS'),
        ]);
    }
}
