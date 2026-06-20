<?php

namespace App\Http\Controllers;

use App\Services\SupplierPaymentService;
use Illuminate\Http\Request;

class SupplierPaymentController extends Controller
{
    public function store(Request $request, string $locale, SupplierPaymentService $supplierPaymentService)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'purchase_id' => 'nullable|exists:purchases,id',
            'branch_id' => 'nullable|exists:branches,id',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01|max:999999999999.99',
            'payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $supplierPaymentService->record($validated, $request->user());

        return redirect()->back()->with('success', 'Supplier payment recorded successfully.');
    }
}
