<!DOCTYPE html>
<html>
<head>
    <title>Print Labels</title>
    <style>
        @page {
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-start;
            padding: 0;
            background-color: white;
            width: fit-content;
            margin: 0 auto;
        }
        .label {
            width: {{ $settings['width'] }}mm;
            height: {{ $settings['height'] }}mm;
            padding: 1mm;
            box-sizing: border-box;
            border: 0.1mm solid #eee;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            page-break-inside: avoid;
        }
        .pharmacy-name {
            font-size: {{ $settings['font_size'] - 2 }}pt;
            font-weight: bold;
            margin-bottom: 0.5mm;
            white-space: nowrap;
        }
        .product-name {
            font-size: {{ $settings['font_size'] }}pt;
            font-weight: bold;
            line-height: 1.1;
            max-height: {{ $settings['font_size'] * 2.2 }}pt;
            overflow: hidden;
        }
        .generic-name {
            font-size: {{ $settings['font_size'] - 1 }}pt;
            font-style: italic;
            color: #555;
            white-space: nowrap;
            overflow: hidden;
            width: 100%;
        }
        .barcode {
            margin:  0;
            width: 100%;
            display: flex;
            justify-content: center;
        }
        .barcode svg {
            max-width: 100%;
            height: {{ $settings['barcode_height'] -12 }}mm;
        }
        .barcode-text {
            font-size: 6pt;
            margin-top: -0.5mm;
            margin-bottom: 0.5mm;
            line-height: 1;
        }
        .footer {
            display: flex;
            justify-content: space-between;
            width: 100%;
            font-size: {{ $settings['font_size'] - 1 }}pt;
            font-weight: bold;
            margin-top: 0.5mm;
        }
        .price {
            color: black;
        }
        .expiry {
            font-size: {{ $settings['font_size'] - 2 }}pt;
        }

        @media print {
            body {
                background-color: white;
            }
            .container {
                width: 100%;
                margin: 0;
            }
            .label {
                border: none;
            }
            .no-print {
                display: none;
            }
        }

        .no-print {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1976d2;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            cursor: pointer;
            border: none;
        }
    </style>
</head>
<body>
    <button class="no-print" onclick="window.print()">Print Labels</button>

    <div class="container">
        @foreach($labels as $label)
            <div class="label">
                @if($settings['show_pharmacy'])
                    <div class="pharmacy-name">{{ $settings['pharmacy_name'] }}</div>
                @endif

                @if($settings['show_product'])
                    <div class="product-name">{{ $label['product']->name }}</div>
                @endif

                @if($settings['show_generic'] && $label['product']->generic_name)
                    <div class="generic-name">{{ $label['product']->generic_name }}</div>
                @endif

                <div class="barcode">
                    {!! $label['barcode_svg'] !!}
                </div>
                <div class="barcode-text">{{ $label['product']->barcode }}</div>

                <div class="footer">
                    @if($settings['show_price'])
                        <div class="price">{{ $settings['currency'] }}{{ number_format($label['price'], 2) }}</div>
                    @endif

                    @if($settings['show_expiry'])
                        <div class="expiry">Exp: {{ $label['expiry_date'] }}</div>
                    @endif

                    @if($settings['show_batch'])
                        <div class="expiry">B: {{ $label['batch_number'] }}</div>
                    @endif
                </div>
            </div>
        @endforeach
    </div>
</body>
</html>
