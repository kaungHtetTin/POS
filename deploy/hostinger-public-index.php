<?php
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
define('LARAVEL_START', microtime(true));
$private=dirname(__DIR__).'/_pharmacy_app';
if (!is_file($private.'/.installed')) { http_response_code(503); header('Retry-After: 60'); exit('Pharmacy setup is in progress.'); }
if (file_exists($maintenance=$private.'/storage/framework/maintenance.php')) require $maintenance;
require $private.'/vendor/autoload.php';
$app=require $private.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);
$kernel=$app->make(Kernel::class);
$response=$kernel->handle($request=Request::capture())->send();
$kernel->terminate($request,$response);
