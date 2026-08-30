<?php

namespace App\Support;

use App\Http\Middleware\HandleSpaRequests;
use Closure;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use JsonSerializable;

final class Spa
{
    /**
     * Render a React page for a direct browser request or return its JSON
     * representation to the SPA navigation client.
     */
    public static function render(string $component, array $props = []): Response|JsonResponse
    {
        $request = request();
        $shared = app(HandleSpaRequests::class)->share($request);
        $page = [
            'component' => $component,
            'props' => self::resolve(array_replace_recursive($shared, $props)),
            'url' => self::requestUrl($request),
        ];

        if ($request->headers->get('X-SPA') === 'true') {
            return response()->json($page)->header('Vary', 'X-SPA');
        }

        return response()
            ->view('app', ['page' => $page])
            ->header('Vary', 'X-SPA');
    }

    private static function requestUrl(Request $request): string
    {
        $query = $request->getQueryString();

        return $request->getPathInfo().($query ? '?'.$query : '');
    }

    private static function resolve(mixed $value): mixed
    {
        if ($value instanceof Closure) {
            return self::resolve($value());
        }

        if ($value instanceof Arrayable) {
            return self::resolve($value->toArray());
        }

        if ($value instanceof JsonSerializable) {
            return self::resolve($value->jsonSerialize());
        }

        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = self::resolve($item);
            }
        }

        return $value;
    }
}
