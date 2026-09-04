<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#087f74">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="Cashier POS">
        <meta name="description" content="Mobile point of sale for pharmacy cashiers">

        <title>Cashier POS - {{ config('app.name', 'Pharmacy POS') }}</title>

        <link rel="manifest" href="{{ route('cashier-pwa.manifest') }}">
        <link rel="icon" href="{{ url('/pwa/cashier-icon.svg') }}" type="image/svg+xml">
        <link rel="apple-touch-icon" sizes="192x192" href="{{ url('/pwa/cashier-icon-192.png') }}">

        <script>
            window.cashierPwa = {{ Illuminate\Support\Js::from($cashierPwaConfig) }};
        </script>
        @viteReactRefresh
        @vite('resources/js/mobile/main.jsx', 'cashier-build')
    </head>
    <body>
        <noscript>This cashier app requires JavaScript.</noscript>
        <div id="cashier-app"></div>
    </body>
</html>
