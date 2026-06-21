<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnitController extends Controller
{
    public function index()
    {
        return Inertia::render('Units/Index', [
            'units' => Unit::withCount('product_units')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:units,name',
            'short_name' => 'required|string|max:50|unique:units,short_name',
        ]);

        Unit::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, string $locale, Unit $unit)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:units,name,' . $unit->id,
            'short_name' => 'required|string|max:50|unique:units,short_name,' . $unit->id,
        ]);

        $unit->update($validated);

        return redirect()->back();
    }

    public function destroy(string $locale, Unit $unit)
    {
        if ($unit->product_units()->exists()) {
            abort(403, 'Unit cannot be deleted because it is associated with products.');
        }

        $unit->delete();

        return redirect()->back();
    }
}
