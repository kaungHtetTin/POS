<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query()->withCount('purchases');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('phone', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function show(string $locale, Supplier $supplier)
    {
        $supplier->loadCount('purchases');

        $purchases = $supplier->purchases()
            ->with(['branch:id,name'])
            ->withCount('items')
            ->latest()
            ->paginate(10, ['*'], 'purchases_page')
            ->withQueryString();

        $payments = $supplier->payments()
            ->with(['purchase:id,invoice_number', 'branch:id,name', 'user:id,name'])
            ->latest('payment_date')
            ->latest()
            ->paginate(10, ['*'], 'payments_page')
            ->withQueryString();

        $duePurchases = $supplier->purchases()
            ->with(['branch:id,name'])
            ->where('due_amount', '>', 0)
            ->oldest('due_date')
            ->get();

        $statementSummary = [
            'total_purchases' => (float) $supplier->purchases()->sum('total_amount'),
            'total_due' => (float) $supplier->purchases()->sum('due_amount'),
            'total_payments' => (float) $supplier->payments()->sum('amount'),
        ];

        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier,
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
            'phone' => 'required|string|max:20|unique:suppliers,phone',
            'email' => 'nullable|email|max:255|unique:suppliers,email',
            'address' => 'nullable|string|max:500',
            'payment_terms' => 'nullable|string|max:500',
            'credit_limit' => 'required|numeric|min:0|max:999999999999.99',
        ]);

        Supplier::create($validated);

        return redirect()->back()->with('success', 'Supplier created successfully.');
    }

    public function update(Request $request, string $locale, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20|unique:suppliers,phone,' . $supplier->id,
            'email' => 'nullable|email|max:255|unique:suppliers,email,' . $supplier->id,
            'address' => 'nullable|string|max:500',
            'payment_terms' => 'nullable|string|max:500',
            'credit_limit' => 'required|numeric|min:0|max:999999999999.99',
        ]);

        $supplier->update($validated);

        return redirect()->back()->with('success', 'Supplier updated successfully.');
    }

    public function destroy(string $locale, Supplier $supplier)
    {
        if ($supplier->purchases()->exists()) {
            return redirect()->back()->with('error', 'Supplier cannot be deleted because it has related purchases.');
        }

        $supplier->delete();

        return redirect()->back()->with('success', 'Supplier deleted successfully.');
    }
}
