<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Support\Spa;

class PermissionsController extends Controller
{
    public function index()
    {
        return Spa::render('Permissions/Index');
    }
}
