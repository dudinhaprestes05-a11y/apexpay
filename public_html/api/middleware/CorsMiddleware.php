<?php

class CorsMiddleware {
    public function handle(Request $request, Response $response) {
        $config = require __DIR__ . '/../config/cors.php';

        $origin = $request->header('ORIGIN');
        $allowedOrigins = $config['allowed_origins'];

        if (in_array('*', $allowedOrigins)) {
            $response->header('Access-Control-Allow-Origin', '*');
        } elseif ($origin && in_array($origin, $allowedOrigins)) {
            $response->header('Access-Control-Allow-Origin', $origin);
        }

        $response->header('Access-Control-Allow-Methods', implode(', ', $config['allowed_methods']));
        $response->header('Access-Control-Allow-Headers', implode(', ', $config['allowed_headers']));
        $response->header('Access-Control-Expose-Headers', implode(', ', $config['exposed_headers']));
        $response->header('Access-Control-Max-Age', $config['max_age']);

        if ($config['credentials']) {
            $response->header('Access-Control-Allow-Credentials', 'true');
        }

        if ($request->method() === 'OPTIONS') {
            $response->status(200)->send();
        }
    }
}
