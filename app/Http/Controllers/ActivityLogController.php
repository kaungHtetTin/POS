<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Support\Spa;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $fromInput = trim((string) $request->get('from_date', ''));
        $toInput = trim((string) $request->get('to_date', ''));
        $userId = trim((string) $request->get('user_id', ''));
        $method = strtoupper(trim((string) $request->get('method', '')));
        $actionKeyword = trim((string) $request->get('action', ''));

        $fromDate = $this->parseDate($fromInput, true);
        $toDate = $this->parseDate($toInput, false);

        if ($fromDate && $toDate && $fromDate->greaterThan($toDate)) {
            [$fromDate, $toDate] = [$toDate->copy()->startOfDay(), $fromDate->copy()->endOfDay()];
        }

        $allowedMethods = ['POST', 'PATCH', 'PUT', 'DELETE', 'GET'];
        if (!in_array($method, $allowedMethods, true)) {
            $method = '';
        }

        $logs = ActivityLog::query()
            ->with(['user:id,name,email', 'branch:id,name'])
            ->when($userId !== '', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->when($method !== '', function ($q) use ($method) {
                $q->where('method', $method);
            })
            ->when($actionKeyword !== '', function ($q) use ($actionKeyword) {
                $q->where(function ($qq) use ($actionKeyword) {
                    $qq->where('action', 'like', "%{$actionKeyword}%")
                        ->orWhere('description', 'like', "%{$actionKeyword}%")
                        ->orWhere('route_name', 'like', "%{$actionKeyword}%");
                });
            })
            ->when($fromDate, function ($q) use ($fromDate) {
                $q->where('created_at', '>=', $fromDate);
            })
            ->when($toDate, function ($q) use ($toDate) {
                $q->where('created_at', '<=', $toDate);
            })
            ->orderByDesc('created_at')
            ->paginate(50)
            ->withQueryString()
            ->through(function ($log) {
                return [
                    'id' => $log->id,
                    'created_at' => optional($log->created_at)->toDateTimeString(),
                    'user_name' => $log->user?->name ?? 'Unknown',
                    'user_email' => $log->user?->email ?? '-',
                    'branch_name' => $log->branch?->name ?? '-',
                    'method' => $log->method ?? '-',
                    'action' => $log->action,
                    'description' => $log->description,
                    'route_name' => $log->route_name,
                    'ip_address' => $log->ip_address,
                    'url' => $log->url,
                    'properties' => $log->properties,
                ];
            });

        $users = User::query()
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->limit(200)
            ->get();

        return Spa::render('ActivityLogs/Index', [
            'users' => $users,
            'filters' => [
                'from_date' => $fromDate?->toDateString() ?? '',
                'to_date' => $toDate?->toDateString() ?? '',
                'user_id' => $userId,
                'method' => $method,
                'action' => $actionKeyword,
            ],
            'logs' => $logs,
        ]);
    }

    protected function parseDate(string $value, bool $start): ?Carbon
    {
        if ($value === '') {
            return null;
        }

        try {
            return $start ? Carbon::parse($value)->startOfDay() : Carbon::parse($value)->endOfDay();
        } catch (\Throwable $e) {
            return null;
        }
    }
}
