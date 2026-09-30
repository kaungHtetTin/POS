<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Support\PharmacyAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavigationPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_navigation_receives_every_permission_without_permission_pivot_rows(): void
    {
        $owner = Role::create(['name' => PharmacyAccess::OWNER]);
        $user = User::factory()->create();
        $user->roles()->attach($owner);

        $response = $this->actingAs($user)->get('/dashboard', ['X-SPA' => 'true']);

        $response->assertOk();
        $this->assertEqualsCanonicalizing(
            PharmacyAccess::permissionSlugs(),
            $response->json('props.auth.user.permissions')
        );
    }
}
