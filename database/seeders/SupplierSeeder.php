<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run()
    {
        $suppliers = [
            [
                'name' => 'MedCare Distribution Ltd.',
                'phone' => '01710000001',
                'email' => 'contact@medcare-distribution.com',
                'address' => '12 Health Avenue, Dhaka',
                'payment_terms' => 'Net 30',
                'credit_limit' => 50000.00,
                'balance' => 12000.00,
            ],
            [
                'name' => 'Prime Pharma Wholesale',
                'phone' => '01710000002',
                'email' => 'sales@primepharma.com',
                'address' => '44 Central Road, Chattogram',
                'payment_terms' => 'Net 15',
                'credit_limit' => 40000.00,
                'balance' => 9500.00,
            ],
            [
                'name' => 'HealthBridge Suppliers',
                'phone' => '01710000003',
                'email' => 'info@healthbridge-suppliers.com',
                'address' => '7 Market Lane, Khulna',
                'payment_terms' => 'Net 30',
                'credit_limit' => 35000.00,
                'balance' => 5000.00,
            ],
            [
                'name' => 'NovaMed Trading',
                'phone' => '01710000004',
                'email' => 'support@novamedtrading.com',
                'address' => '89 River View, Sylhet',
                'payment_terms' => 'Advance 50%',
                'credit_limit' => 30000.00,
                'balance' => 0.00,
            ],
            [
                'name' => 'CureLine Pharma Link',
                'phone' => '01710000005',
                'email' => 'orders@curelinepharma.com',
                'address' => '25 Station Road, Rajshahi',
                'payment_terms' => 'Net 21',
                'credit_limit' => 45000.00,
                'balance' => 15750.00,
            ],
            [
                'name' => 'Wellness Drug Importers',
                'phone' => '01710000006',
                'email' => 'office@wellnessdrugimporters.com',
                'address' => '13 Green Street, Barishal',
                'payment_terms' => 'Net 30',
                'credit_limit' => 60000.00,
                'balance' => 21000.00,
            ],
            [
                'name' => 'CityMed Supply House',
                'phone' => '01710000007',
                'email' => 'team@citymedsupply.com',
                'address' => '66 New Market, Cumilla',
                'payment_terms' => 'Net 10',
                'credit_limit' => 25000.00,
                'balance' => 4300.00,
            ],
            [
                'name' => 'Apex Life Sciences Traders',
                'phone' => '01710000008',
                'email' => 'hello@apexlifesciences.com',
                'address' => '101 Medical Hub, Rangpur',
                'payment_terms' => 'Net 45',
                'credit_limit' => 70000.00,
                'balance' => 34000.00,
            ],
            [
                'name' => 'EverCure Pharmaceuticals',
                'phone' => '01710000009',
                'email' => 'sales@evercurepharma.com',
                'address' => '58 Hospital Road, Mymensingh',
                'payment_terms' => 'Net 20',
                'credit_limit' => 38000.00,
                'balance' => 8750.00,
            ],
            [
                'name' => 'TrustMed Healthcare Supply',
                'phone' => '01710000010',
                'email' => 'contact@trustmedhealthcare.com',
                'address' => '9 Doctors Plaza, Gazipur',
                'payment_terms' => 'Net 30',
                'credit_limit' => 52000.00,
                'balance' => 14300.00,
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::updateOrCreate(
                ['phone' => $supplier['phone']],
                $supplier
            );
        }
    }
}
