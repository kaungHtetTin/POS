<?php

namespace Tests\Feature;

use Tests\TestCase;

class CashierPwaTest extends TestCase
{
    public function test_cashier_pwa_shell_is_publicly_available(): void
    {
        $this->get('/cashier/')
            ->assertOk()
            ->assertSee('id="cashier-app"', false)
            ->assertSee('manifest.webmanifest');
    }

    public function test_cashier_manifest_has_installable_app_metadata(): void
    {
        $this->get('/cashier/manifest.webmanifest')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/manifest+json')
            ->assertJsonPath('display', 'standalone')
            ->assertJsonPath('short_name', 'Cashier POS')
            ->assertJsonCount(3, 'icons')
            ->assertJsonPath('icons.0.sizes', '192x192')
            ->assertJsonPath('icons.1.sizes', '512x512')
            ->assertJsonPath('icons.2.purpose', 'maskable');
    }
}
