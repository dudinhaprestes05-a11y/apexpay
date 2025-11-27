<?php

error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Router.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Auth.php';
require_once __DIR__ . '/core/Validator.php';
require_once __DIR__ . '/middleware/CorsMiddleware.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/AdminMiddleware.php';
require_once __DIR__ . '/middleware/RateLimitMiddleware.php';

if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
    }
}

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'UTC');

set_exception_handler(function($exception) {
    error_log('Uncaught exception: ' . $exception->getMessage());
    error_log('Stack trace: ' . $exception->getTraceAsString());

    $response = new Response();

    if (getenv('APP_DEBUG') === 'true') {
        $response->error($exception->getMessage(), 500, [
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTrace()
        ])->send();
    } else {
        $response->serverError()->send();
    }
});

$request = new Request();
$response = new Response();
$router = new Router();

error_log('Request: ' . $request->method() . ' ' . $request->uri());

$corsMiddleware = new CorsMiddleware();
$corsMiddleware->handle($request, $response);

require_once __DIR__ . '/config/routes.php';

$router->dispatch($request, $response);
