<?php

class CorsMiddleware {
    public function handle(Request $request, Response $response) {
        $config = require __DIR__ . '/../config/cors.php';

        $origin = $request->header('ORIGIN');
        $allowedOrigins = $config['allowed_origins'];

        error_log('CORS: Origin = ' . ($origin ?: 'not set'));
        error_log('CORS: Allowed origins = ' . json_encode($allowedOrigins));

        if (in_array('*', $allowedOrigins)) {
            $response->header('Access-Control-Allow-Origin', '*');
            error_log('CORS: Set Allow-Origin to *');
        } elseif ($origin && in_array($origin, $allowedOrigins)) {
            $response->header('Access-Control-Allow-Origin', $origin);
            error_log('CORS: Set Allow-Origin to ' . $origin);
        }

        $response->header('Access-Control-Allow-Methods', implode(', ', $config['allowed_methods']));
        $response->header('Access-Control-Allow-Headers', implode(', ', $config['allowed_headers']));
        $response->header('Access-Control-Expose-Headers', implode(', ', $config['exposed_headers']));
        $response->header('Access-Control-Max-Age', $config['max_age']);

        if ($config['credentials']) {
            $response->header('Access-Control-Allow-Credentials', 'true');
            error_log('CORS: Credentials enabled');
        }

        if ($request->method() === 'OPTIONS') {
            error_log('CORS: OPTIONS request, sending 200');
            $response->status(200)->send();
        }
    }
}
