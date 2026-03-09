<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $branch = Branch::first();
        if (!$branch) {
            return;
        }

        $users = [
            [
                'name' => 'Owner User',
                'email' => 'owner@store.com',
                'password' => Hash::make('password'),
                'role' => 'Owner',
            ],
            [
                'name' => 'Manager User',
                'email' => 'manager@store.com',
                'password' => Hash::make('password'),
                'role' => 'Manager',
            ],
            [
                'name' => 'Cashier User',
                'email' => 'cashier@store.com',
                'password' => Hash::make('password'),
                'role' => 'Cashier',
            ],
        ];

        foreach ($users as $userData) {
            $roleName = $userData['role'];
            unset($userData['role']);
            
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                array_merge($userData, [
                    'branch_id' => $branch->id,
                    'status' => 'Active',
                ])
            );

            $role = Role::where('name', $roleName)->first();
            if ($role && !$user->roles()->where('name', $roleName)->exists()) {
                $user->roles()->attach($role->id);
            }
        }
    }
}
