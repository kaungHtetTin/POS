<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Purchase;
use App\Models\Supplier;
use Illuminate\Http\Request;
use App\Support\Spa;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $branchIds = $this->accessibleBranchIds($request->user());
        $query = Supplier::query()
            ->select('id', 'name', 'phone', 'email', 'address', 'payment_terms', 'credit_limit', 'created_at', 'updated_at')
            ->withCount(['purchases' => fn ($purchaseQuery) => $purchaseQuery->whereIn('branch_id', $branchIds)])
            ->withSum([
                'purchases as balance' => fn ($purchaseQuery) => $purchaseQuery->whereIn('branch_id', $branchIds),
            ], 'due_amount');
        $balances = Purchase::query()
            ->whereIn('branch_id', $branchIds)
            ->selectRaw('supplier_id, COALESCE(SUM(due_amount), 0) as balance')
            ->groupBy('supplier_id')
            ->pluck('balance')
            ->map(fn ($balance) => (float) $balance);
        $summary = [
            'total_suppliers' => Supplier::count(),
            'supplier_payable' => $balances->filter(fn ($balance) => $balance > 0)->sum(),
            'supplier_credit' => abs($balances->filter(fn ($balance) => $balance < 0)->sum()),
            'open_accounts' => $balances->filter(fn ($balance) => abs($balance) > 0.00001)->count(),
        ];

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('phone', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        return Spa::render('Suppliers/Index', [
            'suppliers' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only(['search']),
            'summary' => $summary,
        ]);
    }

    public function show(Request $request, Supplier $supplier)
    {
        $branchIds = $this->accessibleBranchIds($request->user());

        $purchases = $supplier->purchases()
            ->whereIn('branch_id', $branchIds)
            ->with(['branch:id,name'])
            ->withCount('items')
            ->latest()
            ->paginate(10, ['*'], 'purchases_page')
            ->withQueryString();

        $payments = $supplier->payments()
            ->whereIn('branch_id', $branchIds)
            ->with(['purchase:id,invoice_number', 'branch:id,name', 'user:id,name'])
            ->latest('payment_date')
            ->latest()
            ->paginate(10, ['*'], 'payments_page')
            ->withQueryString();

        $duePurchases = $supplier->purchases()
            ->whereIn('branch_id', $branchIds)
            ->with(['branch:id,name'])
            ->where('due_amount', '>', 0)
            ->oldest('due_date')
            ->get();

        $statementSummary = [
            'total_purchases' => (float) $supplier->purchases()->whereIn('branch_id', $branchIds)->sum('total_amount'),
            'total_due' => (float) $supplier->purchases()->whereIn('branch_id', $branchIds)->sum('due_amount'),
            'total_payments' => (float) $supplier->payments()->whereIn('branch_id', $branchIds)->sum('amount'),
        ];

        $supplierPayload = $supplier->only([
            'id', 'name', 'phone', 'email', 'address', 'payment_terms', 'credit_limit',
        ]);
        $supplierPayload['purchases_count'] = $supplier->purchases()->whereIn('branch_id', $branchIds)->count();
        $supplierPayload['balance'] = $statementSummary['total_due'];

        return Spa::render('Suppliers/Show', [
            'supplier' => $supplierPayload,
            'purchases' => $purchases,
            'duePurchases' => $duePurchases,
            'payments' => $payments,
            'statementSummary' => $statementSummary,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20|unique:suppliers,phone',
            'email' => 'nullable|email|max:255|unique:suppliers,email',
            'address' => 'nullable|string|max:500',
            'payment_terms' => 'nullable|string|max:500',
        ]);

        Supplier::create($validated);

        return redirect()->back()->with('success', 'Supplier created successfully.');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20|unique:suppliers,phone,' . $supplier->id,
            'email' => 'nullable|email|max:255|unique:suppliers,email,' . $supplier->id,
            'address' => 'nullable|string|max:500',
            'payment_terms' => 'nullable|string|max:500',
        ]);

        $supplier->update($validated);

        return redirect()->back()->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->purchases()->exists()) {
            return redirect()->back()->with('error', 'Supplier cannot be deleted because it has related purchases.');
        }

        $supplier->delete();

        return redirect()->back()->with('success', 'Supplier deleted successfully.');
    }

    protected function accessibleBranchIds($user)
    {
        if ($user->hasRole('Owner') || $user->hasRole('Root') || $user->hasPermission('manage_branches')) {
            return Branch::pluck('id');
        }

        $branchIds = collect([$user->branch_id, $user->active_branch_id])->filter();

        try {
            $branchIds = $branchIds->merge($user->branches()->pluck('branches.id'));
        } catch (\Throwable $e) {
            // Keep direct branch assignments when the optional relation is unavailable.
        }

        return $branchIds->unique()->values();
    }
}
