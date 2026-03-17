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

        $previousPath = parse_url(url()->previous(), PHP_URL_PATH) ?: '/';
        $appBasePath = parse_url(config('app.url'), PHP_URL_PATH) ?: '';
        $normalizedBasePath = '/' . trim($appBasePath, '/');

        if ($normalizedBasePath !== '/' && str_starts_with($previousPath, $normalizedBasePath)) {
            $previousPath = substr($previousPath, strlen($normalizedBasePath)) ?: '/';
        }

        $segments = array_values(array_filter(explode('/', trim($previousPath, '/'))));

        // When served from /.../public without a vhost, "public" can leak into path parsing.
        if (($segments[0] ?? null) === 'public') {
            array_shift($segments);
        }

        // Check if the first segment is a locale
        if (isset($segments[0]) && in_array($segments[0], ['en', 'my'])) {
            $segments[0] = $lang;
        } else {
            // Prepend the new locale
            array_unshift($segments, $lang);
        }

        $newPath = '/' . implode('/', $segments);

        return redirect()->to(url($newPath));
    }
}
