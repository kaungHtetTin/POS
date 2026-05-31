<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index()
    {
        $posBehavior = [
            'default_view' => Setting::get('pos.default_view', 'table'),
            'default_payment_method' => Setting::get('pos.default_payment_method', 'Cash'),
            'auto_print_receipt' => Setting::get('pos.auto_print_receipt', '0') === '1',
            'barcode_focus' => Setting::get('pos.barcode_focus', '1') === '1',
            'show_generic_first' => Setting::get('pos.show_generic_first', '0') === '1',
            'receipt_width' => (int) Setting::get('pos.receipt_width', '80'),
            'silent_print' => Setting::get('pos.silent_print', '0') === '1',
            'silent_printer_name' => Setting::get('pos.silent_printer_name', ''),
        ];

        $notifications = [
            'expiry_alert_days' => (int) Setting::get('inventory.expiry_alert_days', '90'),
            'low_stock_sound' => Setting::get('inventory.low_stock_sound', '1') === '1',
        ];

        $localization = [
            // Keep selector aligned with current app-bar locale (URL locale).
            'locale' => app()->getLocale(),
            'date_format' => Setting::get('app.date_format', 'Y-m-d'),
            'time_format' => Setting::get('app.time_format', 'H:i:s'),
            'timezone' => Setting::get('app.timezone', 'UTC'),
            'currency_code' => Setting::get('app.currency_code', 'USD'),
            'currency_symbol' => Setting::get('app.currency_symbol', '$'),
            'theme_primary_color' => Setting::get('app.theme_primary_color', '#00796b'),
            'week_start' => (int) Setting::get('app.week_start', '0'), // 0 = Sunday
        ];

        $invoice = [
            'pharmacy_name' => Setting::get('invoice.pharmacy_name', config('app.name')),
            'logo_path' => Setting::get('invoice.logo_path', ''),
            'default_tax_id' => Setting::get('invoice.default_tax_id', ''),
            'receipt_header' => Setting::get('invoice.receipt_header', ''),
            'receipt_footer' => Setting::get('invoice.receipt_footer', ''),
            'invoice_prefix' => Setting::get('invoice.prefix', 'S'),
            'enable_tax' => Setting::get('tax.enabled', '1') === '1',
        ];

        $labels = [
            'width' => (int) Setting::get('label.width', '40'),
            'height' => (int) Setting::get('label.height', '30'),
            'labels_per_row' => (int) Setting::get('label.per_row', '1'),
            'show_pharmacy_name' => Setting::get('label.show_pharmacy', '1') === '1',
            'show_product_name' => Setting::get('label.show_product', '1') === '1',
            'show_generic_name' => Setting::get('label.show_generic', '0') === '1',
            'show_price' => Setting::get('label.show_price', '1') === '1',
            'show_expiry' => Setting::get('label.show_expiry', '1') === '1',
            'show_batch' => Setting::get('label.show_batch', '0') === '1',
            'font_size' => (int) Setting::get('label.font_size', '8'),
            'barcode_height' => (int) Setting::get('label.barcode_height', '10'),
            'symbology' => Setting::get('label.symbology', 'CODE_128'),
        ];

        return Inertia::render('Settings/Index', [
            'pos_behavior' => $posBehavior,
            'notifications' => $notifications,
            'localization' => $localization,
            'invoice' => $invoice,
            'labels' => $labels,
            // Tax status is stored as boolean in TaxController; keep compatibility with legacy string values.
            'taxes' => \App\Models\Tax::query()
                ->whereIn('status', [1, '1', true, 'Active', 'active'])
                ->get(['id', 'name', 'rate']),
        ]);
    }

    public function updateLabels(Request $request)
    {
        $validated = $request->validate([
            'width' => 'required|integer|min:10|max:210',
            'height' => 'required|integer|min:10|max:297',
            'labels_per_row' => 'required|integer|min:1|max:10',
            'show_pharmacy_name' => 'required|boolean',
            'show_product_name' => 'required|boolean',
            'show_generic_name' => 'required|boolean',
            'show_price' => 'required|boolean',
            'show_expiry' => 'required|boolean',
            'show_batch' => 'required|boolean',
            'font_size' => 'required|integer|min:4|max:24',
            'barcode_height' => 'required|integer|min:5|max:50',
            'symbology' => 'required|in:CODE_128,EAN_13,QR_CODE',
        ]);

        Setting::set('label.width', (string) $validated['width']);
        Setting::set('label.height', (string) $validated['height']);
        Setting::set('label.per_row', (string) $validated['labels_per_row']);
        Setting::set('label.show_pharmacy', $validated['show_pharmacy_name'] ? '1' : '0');
        Setting::set('label.show_product', $validated['show_product_name'] ? '1' : '0');
        Setting::set('label.show_generic', $validated['show_generic_name'] ? '1' : '0');
        Setting::set('label.show_price', $validated['show_price_name'] ?? $validated['show_price'] ? '1' : '0');
        Setting::set('label.show_expiry', $validated['show_expiry'] ? '1' : '0');
        Setting::set('label.show_batch', $validated['show_batch'] ? '1' : '0');
        Setting::set('label.font_size', (string) $validated['font_size']);
        Setting::set('label.barcode_height', (string) $validated['barcode_height']);
        Setting::set('label.symbology', $validated['symbology']);

        return redirect()->back()->with('success', 'Label settings updated successfully.');
    }

    public function updateInvoice(Request $request)
    {
        $validated = $request->validate([
            'pharmacy_name' => 'required|string|max:255',
            'logo' => 'nullable|image|max:2048',
            'default_tax_id' => 'nullable|exists:taxes,id',
            'receipt_header' => 'nullable|string|max:1000',
            'receipt_footer' => 'nullable|string|max:1000',
            'invoice_prefix' => 'nullable|string|max:10',
            'enable_tax' => 'required|boolean',
        ]);

        Setting::set('invoice.pharmacy_name', $validated['pharmacy_name']);
        
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('settings', 'public');
            Setting::set('invoice.logo_path', $path);
        }

        Setting::set('invoice.default_tax_id', $validated['default_tax_id'] ?? '');
        Setting::set('invoice.receipt_header', $validated['receipt_header'] ?? '');
        Setting::set('invoice.receipt_footer', $validated['receipt_footer'] ?? '');
        Setting::set('invoice.prefix', $validated['invoice_prefix'] ?? 'S');
        Setting::set('tax.enabled', $validated['enable_tax'] ? '1' : '0');

        return redirect()->back()->with('success', 'Invoice and receipt settings updated successfully.');
    }

    public function updatePosBehavior(Request $request)
    {
        $validated = $request->validate([
            'default_view' => 'required|in:table,grid',
            'default_payment_method' => 'required|in:Cash,Card,Mobile,Wallet',
            'auto_print_receipt' => 'required|boolean',
            'barcode_focus' => 'required|boolean',
            'show_generic_first' => 'required|boolean',
            'receipt_width' => 'required|in:58,80',
            'silent_print' => 'required|boolean',
            'silent_printer_name' => 'nullable|string|max:255',
        ]);

        Setting::set('pos.default_view', $validated['default_view']);
        Setting::set('pos.default_payment_method', $validated['default_payment_method']);
        Setting::set('pos.auto_print_receipt', $validated['auto_print_receipt'] ? '1' : '0');
        Setting::set('pos.barcode_focus', $validated['barcode_focus'] ? '1' : '0');
        Setting::set('pos.show_generic_first', $validated['show_generic_first'] ? '1' : '0');
        Setting::set('pos.receipt_width', (string) $validated['receipt_width']);
        Setting::set('pos.silent_print', $validated['silent_print'] ? '1' : '0');
        Setting::set('pos.silent_printer_name', trim((string) ($validated['silent_printer_name'] ?? '')));

        return redirect()->back()->with('success', 'POS behavior settings updated successfully.');
    }

    public function updateNotifications(Request $request)
    {
        $validated = $request->validate([
            'expiry_alert_days' => 'required|integer|min:1|max:365',
            'low_stock_sound' => 'required|boolean',
        ]);

        Setting::set('inventory.expiry_alert_days', (string) $validated['expiry_alert_days']);
        Setting::set('inventory.low_stock_sound', $validated['low_stock_sound'] ? '1' : '0');

        return redirect()->back()->with('success', 'Notification settings updated successfully.');
    }

    public function updateGeneral(Request $request)
    {
        $validated = $request->validate([
            'expiry_alert_days' => 'required|integer|min:1|max:365',
            'low_stock_sound' => 'required|boolean',
            'pharmacy_name' => 'required|string|max:255',
            'logo' => 'nullable|image|max:2048',
            'theme_primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        Setting::set('inventory.expiry_alert_days', (string) $validated['expiry_alert_days']);
        Setting::set('inventory.low_stock_sound', $validated['low_stock_sound'] ? '1' : '0');
        Setting::set('invoice.pharmacy_name', $validated['pharmacy_name']);
        Setting::set('app.theme_primary_color', strtoupper($validated['theme_primary_color']));

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('settings', 'public');
            Setting::set('invoice.logo_path', $path);
        }

        return redirect()->back()->with('success', 'General settings updated successfully.');
    }

    public function updateLocalization(Request $request)
    {
        $validated = $request->validate([
            'locale' => 'required|in:en,my',
            'date_format' => 'required|string|max:20',
            'time_format' => 'required|string|max:20',
            'timezone' => 'required|in:UTC,Asia/Yangon',
            'currency_code' => 'required|string|max:10',
            'currency_symbol' => 'required|string|max:5',
            'theme_primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'week_start' => 'required|integer|min:0|max:6',
        ]);

        Setting::set('app.locale', $validated['locale']);
        Setting::set('app.date_format', $validated['date_format']);
        Setting::set('app.time_format', $validated['time_format']);
        Setting::set('app.timezone', $validated['timezone']);
        Setting::set('app.currency_code', $validated['currency_code']);
        Setting::set('app.currency_symbol', $validated['currency_symbol']);
        Setting::set('app.theme_primary_color', strtoupper($validated['theme_primary_color']));
        Setting::set('app.week_start', (string) $validated['week_start']);

        return redirect()
            ->route('settings.index', ['locale' => $validated['locale']])
            ->with('success', 'Localization settings updated successfully.');
    }
}
