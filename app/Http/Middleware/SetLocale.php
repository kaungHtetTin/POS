<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use App\Models\Setting;

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

        $locale = $request->session()->get('locale');

        if (!in_array($locale, ['en', 'my'])) {
            try {
                $locale = Setting::get('app.locale', config('app.locale', 'en'));
            } catch (\Throwable $e) {
                $locale = config('app.locale', 'en');
            }
        }

        App::setLocale($locale);

        return $next($request);
    }
}
