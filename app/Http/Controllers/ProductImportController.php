<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Tax;
use App\Services\CatalogCsv;
use App\Services\ProductCsvImportService;
use App\Services\ProductUnitPriceCsvService;
use App\Support\Spa;
use Illuminate\Http\Request;

class ProductImportController extends Controller
{
    public function create()
    {
        return Spa::render('Products/Import', [
            'categories' => Category::orderBy('name')->get(['name']),
            'taxes' => Tax::where('status', true)->orderBy('name')->get(['name']),
        ]);
    }

    public function template()
    {
        return $this->download('medicine-import-template.csv', function ($output) {
            fputcsv($output, ProductCsvImportService::HEADERS, ',', '"', '');
            fputcsv($output, [
                'Paracetamol', 'Example Brand', 'Pain relief', 'Example Manufacturer', '500mg', '',
                'Tablet', 'tab', '70', '100', '90', '10', '0', '90', '', 'Exclusive', 'Active',
                'Example only - replace or delete this row',
            ], ',', '"', '');
        });
    }

    public function unitPriceTemplate()
    {
        return $this->download('medicine-unit-prices-'.now()->format('Y-m-d-His').'.csv', function ($output) {
            fputcsv($output, ProductUnitPriceCsvService::HEADERS, ',', '"', '');
            Product::query()->with('product_units.unit')->chunkById(250, function ($products) use ($output) {
                foreach ($products as $product) {
                    foreach ($product->product_units as $productUnit) {
                        fputcsv($output, [
                            $product->id, CatalogCsv::safe($product->barcode), CatalogCsv::safe($product->name),
                            CatalogCsv::safe($productUnit->unit->name), CatalogCsv::safe($productUnit->unit->short_name),
                            $productUnit->conversion_factor, $productUnit->is_base_unit ? 'yes' : 'no',
                            $productUnit->is_default_selling_unit ? 'yes' : 'no',
                            $productUnit->selling_price, $productUnit->wholesale_price,
                        ], ',', '"', '');
                    }
                }
            });
        });
    }

    public function store(Request $request, ProductCsvImportService $importer)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'create_missing_categories' => 'required|boolean', 'create_missing_units' => 'required|boolean',
        ]);
        $result = $importer->import($validated['file'], (bool) $validated['create_missing_categories'], (bool) $validated['create_missing_units']);
        return redirect()->route('products.index')->with('success',
            "Import complete: {$result['products']} medicines created; {$result['categories']} categories and {$result['units']} shared units created; {$result['skipped_rows']} blank rows skipped.");
    }

    public function storeUnitPrices(Request $request, ProductUnitPriceCsvService $importer)
    {
        $validated = $request->validate([
            'unit_price_file' => 'required|file|mimes:csv,txt|max:20480', 'create_missing_units' => 'required|boolean',
        ]);
        $result = $importer->import($validated['unit_price_file'], (bool) $validated['create_missing_units']);
        return redirect()->route('products.index')->with('success',
            "Import complete: {$result['products']} medicines processed; {$result['units_created']} product units added; {$result['units_updated']} product units updated; {$result['skipped_rows']} blank rows skipped.");
    }

    private function download(string $filename, callable $write)
    {
        return response()->streamDownload(function () use ($write) {
            $output = fopen('php://output', 'wb');
            fwrite($output, "\xEF\xBB\xBF");
            try {
                $write($output);
            } finally {
                fclose($output);
            }
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }
}
