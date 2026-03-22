<?php

namespace App\Http\Middleware;

use App\Support\ActivityLogger;
use Closure;
use Illuminate\Http\Request;

class LogUserActivity
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (!$request->user()) {
            return $response;
        }

        $method = strtoupper((string) $request->method());
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $response;
        }

        $routeName = optional($request->route())->getName();
        if ($routeName === 'activity-logs.index') {
            return $response;
        }
        if ($request->is('login') || $request->is('logout')) {
            return $response;
        }

        $action = $routeName ?: strtolower($method) . ' ' . $request->path();
        $description = sprintf(
            '%s %s (%s)',
            $method,
            '/' . ltrim($request->path(), '/'),
            (int) $response->getStatusCode()
        );

        ActivityLogger::log($request, $action, $description, [
            'payload' => $request->except(['_token']),
            'status_code' => (int) $response->getStatusCode(),
        ]);

        return $response;
    }
}
