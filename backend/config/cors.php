<?php

return [
    'allowed_origins' => explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: '*'),
    'allowed_methods' => explode(',', getenv('CORS_ALLOWED_METHODS') ?: 'GET,POST,PUT,DELETE,OPTIONS'),
    'allowed_headers' => explode(',', getenv('CORS_ALLOWED_HEADERS') ?: 'Content-Type,Authorization,X-Requested-With'),
    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    'max_age' => 86400,
    'credentials' => true
];
