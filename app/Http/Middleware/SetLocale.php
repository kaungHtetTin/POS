<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\URL;

class SetLocale
{
    public function handle(Request $request, Closure $next)
    {
        // Route parameter is the most reliable source, regardless of subfolder setup.
        $locale = $request->route('locale') ?? $request->segment(1);

        if (!in_array($locale, ['en', 'my'])) {
            $locale = config('app.locale');
        }

        App::setLocale($locale);
        URL::defaults(['locale' => $locale]);
        config(['ziggy.locale' => $locale]);

        return $next($request);
    }
}
