<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureUserHasPermission;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SalesByCustomersReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_by_customers_report_sorts_customer_rows_by_sale_amount_descending(): void
    {
        $this->withoutMiddleware(EnsureUserHasPermission::class);
        config(['app.url' => 'http://localhost']);
        URL::forceRootUrl('http://localhost');

        $branch = Branch::create([
            'name' => 'Main Branch',
            'phone' => '09123456789',
            'address' => 'Yangon',
            'status' => 'Active',
        ]);

        $user = User::factory()->create(['branch_id' => $branch->id]);
        $topCustomer = Customer::create(['name' => 'Aye Aye', 'phone' => '091111111']);
        $secondCustomer = Customer::create(['name' => 'Mg Mg', 'phone' => '092222222']);

        $this->createSale($branch->id, $user->id, $secondCustomer->id, 'S-CUST-001', 150);
        $this->createSale($branch->id, $user->id, $topCustomer->id, 'S-CUST-002', 450);
        $this->createSale($branch->id, $user->id, null, 'S-CUST-003', 75);

        $response = $this
            ->actingAs($user)
            ->get('/en/reports/sales-by-customers?duration=custom&from_date=2026-07-01&to_date=2026-07-31');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Reports/SalesByCustomers')
            ->where('summary.sale_count', 3)
            ->where('summary.customer_count', 2)
            ->where('customers.data.0.name', 'Aye Aye')
            ->where('customers.data.0.grand_total', 450)
            ->where('customers.data.1.name', 'Mg Mg')
            ->where('customers.data.1.grand_total', 150)
        );
    }

    protected function createSale(string $branchId, string $userId, ?string $customerId, string $invoiceNumber, float $amount): void
    {
        Sale::create([
            'branch_id' => $branchId,
            'user_id' => $userId,
            'customer_id' => $customerId,
            'invoice_number' => $invoiceNumber,
            'total_amount' => $amount,
            'discount' => 0,
            'tax' => 0,
            'grand_total' => $amount,
            'amount_received' => $amount,
            'change_due' => 0,
            'payment_method' => 'Cash',
            'payment_status' => 'Paid',
            'status' => 'Completed',
            'sale_date' => Carbon::parse('2026-07-10 10:00:00'),
        ]);
    }
}
