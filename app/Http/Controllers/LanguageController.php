<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class LanguageController extends Controller
{
    public function switch(Request $request, $lang)
    {
        if (!in_array($lang, ['en', 'my'])) {
            $lang = config('app.locale');
        }

        // Keep localization setting in sync with app-bar language selector.
        Setting::set('app.locale', $lang);

        // Get the previous URL
        $previousUrl = url()->previous();
        $baseUrl = url('/');
        
        // Remove base URL from previous URL to get the path
        $path = str_replace($baseUrl, '', $previousUrl);
        $path = ltrim($path, '/');
        
        $segments = explode('/', $path);
        
        // Check if the first segment is a locale
        if (isset($segments[0]) && in_array($segments[0], ['en', 'my'])) {
            $segments[0] = $lang;
        } else {
            // Prepend the new locale
            array_unshift($segments, $lang);
        }
        
        $newPath = implode('/', $segments);
        
        return redirect($baseUrl . '/' . $newPath);
    }
}
