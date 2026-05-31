<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // $this->call([
        //     RoleSeeder::class,
        //     PermissionSeeder::class,
        //     BranchSeeder::class,
        //     RootUserSeeder::class,
        //     UserSeeder::class,
        //     SupplierSeeder::class,
        //     UnitSeeder::class,
        //     TaxSeeder::class,
        //     ProductSeeder::class,
        //     ProductUnitSeeder::class,
        //     PurchaseSeeder::class,
        //     SaleSeeder::class,
        // ]);

        $this->call([
            RoleSeeder::class,
            PermissionSeeder::class,
            BranchSeeder::class,
            RootUserSeeder::class,
            TaxSeeder::class,
            UnitSeeder::class,
        ]);
    }
}
