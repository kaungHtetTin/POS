<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use App\Support\Spa;

class ExpenseCategoryController extends Controller
{
    public function index()
    {
        return Spa::render('ExpenseCategories/Index', [
            'categories' => ExpenseCategory::withCount('expenses')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories,name',
            'description' => 'nullable|string|max:500',
        ]);

        ExpenseCategory::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories,name,' . $expenseCategory->id,
            'description' => 'nullable|string|max:500',
        ]);

        $expenseCategory->update($validated);

        return redirect()->back();
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        if ($expenseCategory->expenses()->exists()) {
            abort(403, 'Category cannot be deleted because it has assigned expenses.');
        }

        $expenseCategory->delete();

        return redirect()->back();
    }
}
