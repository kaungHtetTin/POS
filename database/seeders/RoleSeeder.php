<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Support\PharmacyAccess;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run(): void
    {
        DB::transaction(function () {
            $legacyRoot = Role::where('name', 'Root')->first();
            $owner = Role::firstOrCreate(['name' => PharmacyAccess::OWNER]);

            if ($legacyRoot && $legacyRoot->isNot($owner)) {
                $owner->users()->syncWithoutDetaching($legacyRoot->users()->pluck('users.id'));
                $legacyRoot->delete();
            }

            foreach (PharmacyAccess::ROLES as $role) {
                Role::firstOrCreate(['name' => $role]);
            }
        });
    }
}
