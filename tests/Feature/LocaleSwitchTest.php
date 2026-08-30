<?php

namespace Tests\Feature;

use Tests\TestCase;

class LocaleSwitchTest extends TestCase
{
    public function test_locale_switch_updates_the_session_without_redirecting(): void
    {
        $response = $this->postJson(route('language.switch'), [
            'locale' => 'my',
        ]);

        $response
            ->assertOk()
            ->assertExactJson(['locale' => 'my']);

        $this->assertSame('my', session('locale'));
    }

    public function test_locale_switch_rejects_an_unsupported_locale(): void
    {
        $response = $this->postJson(route('language.switch'), [
            'locale' => 'fr',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('locale');
    }
}
