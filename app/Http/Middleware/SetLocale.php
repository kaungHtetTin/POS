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
        $appBasePath = trim((string) parse_url(config('app.url'), PHP_URL_PATH), '/');
        if ($appBasePath !== '') {
            $currentPath = '/' . ltrim($request->path(), '/');
            $duplicatedPrefix = '/' . $appBasePath . '/' . $appBasePath;

            if ($currentPath === $duplicatedPrefix || str_starts_with($currentPath, $duplicatedPrefix . '/')) {
                $normalizedPath = '/' . $appBasePath . substr($currentPath, strlen('/' . $appBasePath . '/' . $appBasePath));
                $query = $request->getQueryString();
                $target = $normalizedPath . ($query ? ('?' . $query) : '');

                return redirect()->to($target, 301);
            }
        }

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
