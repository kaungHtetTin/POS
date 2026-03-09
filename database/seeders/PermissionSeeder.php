<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            // Sales
            ['name' => 'Process Sale', 'slug' => 'process_sale'],
            ['name' => 'Cancel Transaction', 'slug' => 'cancel_transaction'],
            
            // Products
            ['name' => 'Add Products', 'slug' => 'add_products'],
            ['name' => 'Edit Products', 'slug' => 'edit_products'],
            
            // Inventory
            ['name' => 'Manage Inventory', 'slug' => 'manage_inventory'],
            ['name' => 'Adjust Stock', 'slug' => 'adjust_stock'],
            
            // Management
            ['name' => 'View Financial Reports', 'slug' => 'view_financial_reports'],
            ['name' => 'Manage Branches', 'slug' => 'manage_branches'],
            ['name' => 'Manage Users', 'slug' => 'manage_users'],
            ['name' => 'Monitor Activity', 'slug' => 'monitor_activity'],
        ];

        $createdPermissions = [];
        foreach ($permissions as $p) {
            $createdPermissions[$p['slug']] = Permission::firstOrCreate($p);
        }

        // Role Assignments
        $owner = Role::where('name', 'Owner')->first();
        $manager = Role::where('name', 'Manager')->first();
        $cashier = Role::where('name', 'Cashier')->first();
        $root = Role::where('name', 'Root')->first();

        if ($root) {
            $root->permissions()->sync(Permission::all());
        }

        if ($owner) {
            $owner->permissions()->sync(Permission::all());
        }

        if ($manager) {
            $manager->permissions()->sync([
                $createdPermissions['process_sale']->id,
                $createdPermissions['cancel_transaction']->id,
                $createdPermissions['add_products']->id,
                $createdPermissions['edit_products']->id,
                $createdPermissions['manage_inventory']->id,
                $createdPermissions['adjust_stock']->id,
                $createdPermissions['monitor_activity']->id,
            ]);
        }

        if ($cashier) {
            $cashier->permissions()->sync([
                $createdPermissions['process_sale']->id,
            ]);
        }
    }
}
