<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Api\PurchaseSyncService;
use App\Services\Api\SaleSyncService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SyncController extends Controller
{
    public function sales(Request $request, SaleSyncService $saleSyncService)
    {
        if (!$request->user()->hasPermission('process_sale')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(
            $this->syncRecords(
                $this->recordsFromRequest($request, 'sales'),
                fn (array $record) => $saleSyncService->sync($record, $request->user()),
                $saleSyncService
            )
        );
    }

    public function purchases(Request $request, PurchaseSyncService $purchaseSyncService)
    {
        if (!$request->user()->hasPermission('manage_inventory')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(
            $this->syncRecords(
                $this->recordsFromRequest($request, 'purchases'),
                fn (array $record) => $purchaseSyncService->sync($record, $request->user()),
                $purchaseSyncService
            )
        );
    }

    private function recordsFromRequest(Request $request, string $key): array
    {
        $records = $request->input($key);

        if (is_array($records)) {
            return $records;
        }

        $payload = $request->all();
        unset($payload[$key]);

        return [$payload];
    }

    private function syncRecords(array $records, callable $sync, object $service): array
    {
        $synced = [];
        $failed = [];

        foreach ($records as $index => $record) {
            if (!is_array($record)) {
                $failed[] = [
                    'index' => $index,
                    'client_reference' => null,
                    'status' => 'failed',
                    'errors' => ['record' => ['Record must be an object.']],
                ];
                continue;
            }

            $clientReference = method_exists($service, 'clientReferenceFrom')
                ? $service->clientReferenceFrom($record)
                : null;

            try {
                $result = $sync($record);

                $synced[] = [
                    'index' => $index,
                    'client_reference' => $result['client_reference'],
                    'status' => $result['created'] ? 'synced' : 'already_synced',
                    'record' => $result['model'],
                ];
            } catch (ValidationException $exception) {
                $failed[] = [
                    'index' => $index,
                    'client_reference' => $clientReference,
                    'status' => 'failed',
                    'errors' => $exception->errors(),
                ];
            } catch (\Throwable $exception) {
                $failed[] = [
                    'index' => $index,
                    'client_reference' => $clientReference,
                    'status' => 'failed',
                    'errors' => ['server' => [$exception->getMessage()]],
                ];
            }
        }

        return [
            'message' => 'Sync completed.',
            'summary' => [
                'total' => count($records),
                'synced' => count($synced),
                'failed' => count($failed),
            ],
            'synced' => $synced,
            'failed' => $failed,
        ];
    }
}
