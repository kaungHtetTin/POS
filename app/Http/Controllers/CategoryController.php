<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use App\Support\Spa;

class CategoryController extends Controller
{
    public function index()
    {
        return Spa::render('Categories/Index', [
            'categories' => Category::withCount('products')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:500',
        ]);

        Category::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
            'description' => 'nullable|string|max:500',
        ]);

        $category->update($validated);

        return redirect()->back();
    }

    public function destroy(Category $category)
    {
        if ($category->products()->exists()) {
            abort(403, 'Category cannot be deleted because it has assigned products.');
        }

        $category->delete();

        return redirect()->back();
    }
}
