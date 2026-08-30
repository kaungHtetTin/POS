<?php

namespace App\Http\Controllers;

use App\Models\Tax;
use Illuminate\Http\Request;
use App\Support\Spa;

class TaxController extends Controller
{
    public function index()
    {
        return Spa::render('Taxes/Index', [
            'taxes' => Tax::withCount('products')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:taxes,name',
            'rate' => 'required|numeric|min:0|max:100',
            'status' => 'boolean',
        ]);

        Tax::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Tax $tax)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:taxes,name,' . $tax->id,
            'rate' => 'required|numeric|min:0|max:100',
            'status' => 'boolean',
        ]);

        $tax->update($validated);

        return redirect()->back();
    }

    public function destroy(Tax $tax)
    {
        if ($tax->products()->exists()) {
            abort(403, 'Tax cannot be deleted because it is assigned to products.');
        }

        $tax->delete();

        return redirect()->back();
    }
}
