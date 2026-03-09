<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
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
        // Create Root Role
        $rootRole = Role::firstOrCreate(['name' => 'Root']);

        // Create Admin/Root User
        $user = User::firstOrCreate(
            ['email' => 'admin@store.com'],
            [
                'name' => 'Root Admin',
                'password' => Hash::make('password'),
                'status' => 'Active',
            ]
        );

        // Assign Role
        if (!$user->roles()->where('name', 'Root')->exists()) {
            $user->roles()->attach($rootRole->id);
        }
    }
}
