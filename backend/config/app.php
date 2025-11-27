<?php

return [
    'env' => getenv('APP_ENV') ?: 'production',
    'debug' => filter_var(getenv('APP_DEBUG'), FILTER_VALIDATE_BOOLEAN),
    'url' => getenv('APP_URL') ?: 'http://localhost',
    'timezone' => getenv('APP_TIMEZONE') ?: 'UTC',

    'jwt' => [
        'secret' => getenv('JWT_SECRET') ?: 'change-this-secret-key',
        'expiration' => (int)(getenv('JWT_EXPIRATION') ?: 86400),
        'refresh_expiration' => (int)(getenv('JWT_REFRESH_EXPIRATION') ?: 604800),
        'algorithm' => 'HS256'
    ],

    'storage' => [
        'path' => getenv('STORAGE_PATH') ?: '../storage',
        'upload_max_size' => (int)(getenv('UPLOAD_MAX_SIZE') ?: 10485760),
        'allowed_mime_types' => explode(',', getenv('ALLOWED_MIME_TYPES') ?: 'application/pdf,image/jpeg,image/png')
    ],

    'rate_limit' => [
        'enabled' => filter_var(getenv('RATE_LIMIT_ENABLED'), FILTER_VALIDATE_BOOLEAN),
        'max_requests' => (int)(getenv('RATE_LIMIT_MAX_REQUESTS') ?: 60),
        'window' => (int)(getenv('RATE_LIMIT_WINDOW') ?: 60)
    ],

    'log' => [
        'level' => getenv('LOG_LEVEL') ?: 'info',
        'path' => getenv('LOG_PATH') ?: '../storage/logs'
    ]
];
