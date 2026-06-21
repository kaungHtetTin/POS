<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use ReflectionMethod;
use ReflectionNamedType;
use Tests\TestCase;

class LocalizedRouteSignatureTest extends TestCase
{
    public function test_localized_dynamic_route_actions_accept_locale_before_route_parameters(): void
    {
        $failures = [];

        foreach (app('router')->getRoutes() as $route) {
            $uri = $route->uri();
            $action = $route->getActionName();

            if (! str_starts_with($uri, '{locale}/') || ! str_contains($uri, '{') || ! str_contains($action, '@')) {
                continue;
            }

            if (count($route->parameterNames()) <= 1) {
                continue;
            }

            [$class, $method] = explode('@', $action);

            if (! method_exists($class, $method)) {
                continue;
            }

            $reflection = new ReflectionMethod($class, $method);
            $routeArguments = array_values(array_filter(
                $reflection->getParameters(),
                function ($parameter) {
                    $type = $parameter->getType();

                    return ! ($type instanceof ReflectionNamedType && is_a($type->getName(), Request::class, true));
                },
            ));

            if (($routeArguments[0] ?? null)?->getName() !== 'locale') {
                $failures[] = sprintf('%s -> %s', $uri, $action);
            }
        }

        $this->assertSame([], $failures);
    }
}
