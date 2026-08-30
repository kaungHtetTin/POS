<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

class LanguageController extends Controller
{
    public function switch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'in:en,my'],
        ]);

        $request->session()->put('locale', $validated['locale']);
        App::setLocale($validated['locale']);

        return response()->json([
            'locale' => $validated['locale'],
        ]);
    }
}
