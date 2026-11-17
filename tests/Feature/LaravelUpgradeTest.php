<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaravelUpgradeTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_boots_with_ziggy_routes(): void
    {
        $this->get('/login')->assertOk()->assertSee('spa-page', false);
        $this->get('/login', ['X-SPA' => 'true'])
            ->assertOk()->assertJsonPath('component', 'Auth/Login')
            ->assertJsonStructure(['props' => ['ziggy' => ['routes']]]);
    }

    public function test_dashboard_only_accepts_accessible_branch_scope(): void
    {
        $branch = Branch::create(['name' => 'Assigned', 'address' => 'Test', 'status' => 'Active']);
        $other = Branch::create(['name' => 'Other', 'address' => 'Test', 'status' => 'Active']);
        $user = User::factory()->create(['branch_id' => $branch->id]);

        $this->actingAs($user)->get('/dashboard?branch_id='.$branch->id, ['X-SPA' => 'true'])
            ->assertOk()->assertJsonPath('props.filters.branch_id', $branch->id)
            ->assertJsonStructure(['props' => ['stats', 'lowStockAlerts', 'expiryAlerts', 'branches']]);
        $this->getJson('/dashboard?branch_id='.$other->id)->assertForbidden();
    }

    public function test_api_permission_errors_remain_json_without_a_web_session(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('upgrade-regression')->plainTextToken;
        $this->withToken($token)->getJson('/api/cashier/sessions/active')
            ->assertForbidden()->assertJsonStructure(['message']);
    }

    public function test_sanctum_login_creates_a_working_token(): void
    {
        $user = User::factory()->create();
        $response = $this->postJson('/api/login', [
            'email' => $user->email, 'password' => 'password', 'device_name' => 'upgrade-test',
        ])->assertOk()->assertJsonStructure(['token']);
        $this->withToken($response->json('token'))->getJson('/api/user')
            ->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_sanctum_rejects_invalid_credentials_without_issuing_tokens(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'incorrect'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
