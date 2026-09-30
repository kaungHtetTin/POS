<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Support\PharmacyAccess;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $permissions = collect(PharmacyAccess::PERMISSIONS)->mapWithKeys(function (array $definition) {
                $permission = Permission::updateOrCreate(
                    ['slug' => $definition['slug']],
                    ['name' => $definition['name']]
                );

                return [$definition['slug'] => $permission];
            });

            $legacyMappings = [
                'add_products' => ['manage_products'],
                'edit_products' => ['manage_products'],
                'manage_users' => ['manage_staff', 'manage_roles_permissions'],
            ];

            foreach ($legacyMappings as $legacySlug => $replacementSlugs) {
                $legacy = Permission::where('slug', $legacySlug)->first();
                if (!$legacy) {
                    continue;
                }

                foreach ($legacy->roles()->pluck('roles.id') as $roleId) {
                    Role::find($roleId)?->permissions()->syncWithoutDetaching(
                        $permissions->only($replacementSlugs)->pluck('id')
                    );
                }

                $legacy->delete();
            }

            Role::where('name', PharmacyAccess::OWNER)->firstOrFail()
                ->permissions()->sync($permissions->pluck('id'));

            foreach (PharmacyAccess::ROLE_PERMISSIONS as $roleName => $slugs) {
                Role::where('name', $roleName)->firstOrFail()
                    ->permissions()->sync($permissions->only($slugs)->pluck('id'));
            }
        });
    }
}
