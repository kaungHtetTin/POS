<?php

namespace App\Http\Controllers;

use App\Services\SupplierCsvImportService;
use App\Support\Spa;
use Illuminate\Http\Request;

class SupplierImportController extends Controller
{
    public function create()
    {
        return Spa::render('Suppliers/Import');
    }

    public function template()
    {
        return response()->streamDownload(function () {
            $output = fopen('php://output', 'wb');
            try {
                fwrite($output, "\xEF\xBB\xBF");
                fputcsv($output, SupplierCsvImportService::HEADERS, ',', '"', '');
                fputcsv($output, ['Example Medical Supplies', '09123456789', 'supplier@example.com',
                    'Example address - replace or delete this row', 'Net 30 days'], ',', '"', '');
            } finally {
                fclose($output);
            }
        }, 'supplier-import-template.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }

    public function store(Request $request, SupplierCsvImportService $importer)
    {
        $validated = $request->validate(['file' => 'required|file|mimes:csv,txt|max:10240']);
        $result = $importer->import($validated['file']);

        return redirect()->route('suppliers.index')->with('success',
            "Import complete: {$result['suppliers']} suppliers created; {$result['skipped_rows']} blank rows skipped.");
    }
}
