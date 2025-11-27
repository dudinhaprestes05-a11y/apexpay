<?php

error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
    }
}

require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/PIX.php';

Auth::init();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace('/api', '', $uri);
$method = $_SERVER['REQUEST_METHOD'];

function sendJson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function getInput() {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

try {
    if ($uri === '/auth/login' && $method === 'POST') {
        require __DIR__ . '/routes/auth.php';
        handleLogin();
    }
    elseif ($uri === '/auth/me' && $method === 'GET') {
        require __DIR__ . '/routes/auth.php';
        handleMe();
    }
    elseif (strpos($uri, '/admin/') === 0) {
        require __DIR__ . '/routes/admin.php';
        handleAdmin($uri, $method);
    }
    elseif (strpos($uri, '/seller/') === 0) {
        require __DIR__ . '/routes/seller.php';
        handleSeller($uri, $method);
    }
    elseif (strpos($uri, '/v1/') === 0) {
        require __DIR__ . '/routes/public.php';
        handlePublic($uri, $method);
    }
    else {
        sendJson(['success' => false, 'message' => 'Endpoint not found'], 404);
    }
} catch (Exception $e) {
    sendJson(['success' => false, 'message' => $e->getMessage()], 400);
}
