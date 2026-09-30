<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Branch;
use App\Support\PharmacyAccess;
use Illuminate\Support\Facades\Hash;

class RootUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Get Main Branch
        $branch = Branch::where('name', 'Main Branch')->first();

        $ownerRole = Role::firstOrCreate(['name' => PharmacyAccess::OWNER]);

        // Create the initial Owner user.
        $user = User::firstOrCreate(
            ['email' => 'admin@store.com'],
            [
                'name' => 'Owner Admin',
                'password' => Hash::make('password'),
                'status' => 'Active',
                'branch_id' => $branch?->id,
                'active_branch_id' => $branch?->id,
            ]
        );

        // Ensure branch is assigned even if user existed
        if ($branch && !$user->branch_id) {
            $user->update([
                'branch_id' => $branch->id,
                'active_branch_id' => $branch->id,
            ]);
        }

        if ($user->name === 'Root Admin') {
            $user->update(['name' => 'Owner Admin']);
        }

        // Keep the initial administrator on the immutable Owner role.
        $user->roles()->sync([$ownerRole->id]);

        // Ensure user can access the branch (pivot table if needed)
        if ($branch && !$user->branches()->where('branches.id', $branch->id)->exists()) {
            $user->branches()->attach($branch->id);
        }
    }
}
