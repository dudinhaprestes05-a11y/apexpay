<?php

error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$env = file_exists(__DIR__ . '/../.env') ? parse_ini_file(__DIR__ . '/../.env') : [];
foreach ($env as $key => $value) {
    putenv("$key=$value");
}

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'apex';
$db_user = getenv('DB_USER') ?: 'apex';
$db_pass = getenv('DB_PASS') ?: '';
$jwt_secret = getenv('JWT_SECRET') ?: 'secret123';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace('/api', '', $uri);
$method = $_SERVER['REQUEST_METHOD'];

if ($uri === '/auth/login' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['email']) || empty($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email e senha obrigatórios']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$input['email']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($input['password'], $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Credenciais inválidas']);
        exit;
    }

    $token_data = base64_encode(json_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + 86400
    ]));

    $signature = hash_hmac('sha256', $token_data, $jwt_secret);
    $token = $token_data . '.' . $signature;

    unset($user['password_hash']);

    echo json_encode([
        'success' => true,
        'data' => [
            'user' => $user,
            'token' => $token
        ]
    ]);
    exit;
}

if ($uri === '/auth/me' && $method === 'GET') {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!preg_match('/Bearer\s+(.+)/', $auth, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token não fornecido']);
        exit;
    }

    $token = $matches[1];
    $parts = explode('.', $token);

    if (count($parts) !== 2) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token inválido']);
        exit;
    }

    list($token_data, $signature) = $parts;

    if (hash_hmac('sha256', $token_data, $jwt_secret) !== $signature) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token inválido']);
        exit;
    }

    $payload = json_decode(base64_decode($token_data), true);

    if (!$payload || $payload['exp'] < time()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token expirado']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
        exit;
    }

    unset($user['password_hash']);

    echo json_encode(['success' => true, 'data' => $user]);
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Endpoint não encontrado']);
