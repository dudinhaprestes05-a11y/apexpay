<?php

function getDB() {
    static $pdo = null;

    if ($pdo === null) {
        $host = getenv('DB_HOST') ?: 'localhost';
        $db = getenv('DB_NAME') ?: 'apex';
        $user = getenv('DB_USER') ?: 'apex';
        $pass = getenv('DB_PASS') ?: '';

        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    return $pdo;
}

function createToken($userId, $email, $role) {
    $secret = getenv('JWT_SECRET') ?: 'change-this-secret';

    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'sub' => $userId,
        'email' => $email,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + 86400
    ]));

    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

    return "$header.$payload.$signature";
}

function verifyToken($token) {
    $secret = getenv('JWT_SECRET') ?: 'change-this-secret';

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new Exception('Token inválido');
    }

    list($header, $payload, $signature) = $parts;

    $validSignature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));

    if ($signature !== $validSignature) {
        throw new Exception('Token inválido');
    }

    $data = json_decode(base64_decode($payload), true);

    if (!$data || $data['exp'] < time()) {
        throw new Exception('Token expirado');
    }

    return $data;
}

function login($email, $password) {
    $db = getDB();

    $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        throw new Exception('Email ou senha inválidos');
    }

    $token = createToken($user['id'], $user['email'], $user['role']);

    unset($user['password_hash']);

    return [
        'user' => $user,
        'token' => $token,
        'refresh_token' => $token,
        'expires_in' => 86400
    ];
}

function getCurrentUser() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
        throw new Exception('Token não fornecido');
    }

    $token = $matches[1];
    $payload = verifyToken($token);

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('Usuário não encontrado');
    }

    unset($user['password_hash']);

    return $user;
}
