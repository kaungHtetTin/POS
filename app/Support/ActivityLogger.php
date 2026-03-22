<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogger
{
    /**
     * Write a normalized user activity record.
     */
    public static function log(Request $request, string $action, string $description, array $properties = []): void
    {
        $user = $request->user();
        if (!$user) {
            return;
        }

        try {
            ActivityLog::create([
                'user_id' => $user->id,
                'branch_id' => method_exists($user, 'currentBranchId') ? $user->currentBranchId() : null,
                'action' => $action,
                'description' => $description,
                'method' => strtoupper((string) $request->method()),
                'route_name' => optional($request->route())->getName(),
                'url' => $request->fullUrl(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'properties' => self::sanitizeProperties($properties),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Activity logs are best-effort and must not break user flow.
        }
    }

    /**
     * Keep payload safe and compact for storage.
     */
    protected static function sanitizeProperties(array $properties): array
    {
        $hidden = [
            'password',
            'password_confirmation',
            'current_password',
            '_token',
            'token',
        ];

        $walker = function ($value) use (&$walker, $hidden) {
            if (is_array($value)) {
                $out = [];
                $count = 0;
                foreach ($value as $k => $v) {
                    if ($count >= 30) {
                        $out['__truncated__'] = true;
                        break;
                    }
                    if (is_string($k) && in_array(strtolower($k), $hidden, true)) {
                        $out[$k] = '***';
                    } else {
                        $out[$k] = $walker($v);
                    }
                    $count++;
                }
                return $out;
            }

            if (is_object($value)) {
                return $walker((array) $value);
            }

            if (is_string($value) && strlen($value) > 500) {
                return substr($value, 0, 500) . '...';
            }

            return $value;
        };

        return $walker($properties);
    }
}
