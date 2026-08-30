<?php

namespace App\Http\Controllers;

use App\Support\Spa;
use Illuminate\Http\Request;

class ManualController extends Controller
{
    /**
     * Display the SOP Manual.
     */
    public function index()
    {
        return Spa::render('Manual/Index', [
            'appName' => config('app.name', 'Pharmacy POS'),
        ]);
    }
}
