<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Providers\RouteServiceProvider;
use App\Support\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();
        ActivityLogger::log($request, 'auth.login', 'User logged in.');

        // Determine the target locale: prefer session, then previous URL, then app default
        $locale = $request->session()->get('locale')
            ?? app()->getLocale()
            ?? config('app.locale', 'en');

        $intended = redirect()->intended()->getTargetUrl();

        // If intended URL has no locale prefix, inject the current locale
        if (!preg_match('#^/' . $locale . '/#', parse_url($intended, PHP_URL_PATH) ?? '')) {
            // Fallback to locale-aware dashboard
            return redirect("/{$locale}/dashboard");
        }

        return redirect($intended);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $locale = app()->getLocale() ?: config('app.locale', 'en');

        ActivityLogger::log($request, 'auth.logout', 'User logged out.');
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        // Redirect to locale-aware home page
        return redirect("/{$locale}");
    }
}
