<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Tax;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function invoice(Request $request)
    {
        $logoPath = Setting::get('invoice.logo_path', '');

        return response()->json([
            'pharmacy_name' => Setting::get('invoice.pharmacy_name', config('app.name')),
            'logo_path' => $logoPath,
            'logo_url' => $logoPath ? url('storage/' . $logoPath) : null,
            'default_tax_id' => Setting::get('invoice.default_tax_id', ''),
            'receipt_header' => Setting::get('invoice.receipt_header', ''),
            'receipt_footer' => Setting::get('invoice.receipt_footer', ''),
            'invoice_prefix' => Setting::get('invoice.prefix', 'S'),
            'enable_tax' => Setting::get('tax.enabled', '1') === '1',
            'currency_code' => Setting::get('app.currency_code', 'USD'),
            'currency_symbol' => Setting::get('app.currency_symbol', '$'),
            'date_format' => Setting::get('app.date_format', 'Y-m-d'),
            'time_format' => Setting::get('app.time_format', 'H:i:s'),
            'receipt_width' => (int) Setting::get('pos.receipt_width', '80'),
            'auto_print_receipt' => Setting::get('pos.auto_print_receipt', '0') === '1',
            'silent_print' => Setting::get('pos.silent_print', '0') === '1',
            'silent_printer_name' => Setting::get('pos.silent_printer_name', ''),
            'default_tax' => $this->defaultTax(),
        ]);
    }

    private function defaultTax(): ?array
    {
        $taxId = Setting::get('invoice.default_tax_id', '');

        if (!$taxId) {
            return null;
        }

        $tax = Tax::select('id', 'name', 'rate')->find($taxId);

        return $tax ? $tax->toArray() : null;
    }
}
