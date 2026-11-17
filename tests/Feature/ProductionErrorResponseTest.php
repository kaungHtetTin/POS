<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProductionErrorResponseTest extends TestCase
{
    public function test_unknown_production_route_returns_404_without_a_web_session(): void
    {
        $this->app->instance('env', 'production');
        config(['app.debug' => false]);

        $this->get('/not-a-real-route')->assertNotFound();
    }
}
