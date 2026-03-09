<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class PermissionsController extends Controller
{
    public function index()
    {
        return Inertia::render('Permissions/Index');
    }
}
