<?php

class Auth {
    private static $secret;

    public static function init() {
        self::$secret = getenv('JWT_SECRET') ?: 'change-this-secret-key';
    }

    public static function generateToken($userId, $email, $role) {
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode([
            'user_id' => $userId,
            'email' => $email,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + 86400
        ]));
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", self::$secret, true));
        return "$header.$payload.$signature";
    }

    public static function verifyToken($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }

        list($header, $payload, $signature) = $parts;
        $validSignature = base64_encode(hash_hmac('sha256', "$header.$payload", self::$secret, true));

        if ($signature !== $validSignature) {
            throw new Exception('Invalid token signature');
        }

        $data = json_decode(base64_decode($payload), true);
        if (!$data || $data['exp'] < time()) {
            throw new Exception('Token expired');
        }

        return $data;
    }

    public static function getCurrentUser() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.+)/', $auth, $matches)) {
            throw new Exception('No token provided');
        }

        $payload = self::verifyToken($matches[1]);
        $db = Database::getInstance();

        $user = $db->fetchOne("SELECT * FROM users WHERE id = ?", [$payload['user_id']]);
        if (!$user) {
            throw new Exception('User not found');
        }

        unset($user['password_hash']);
        return $user;
    }

    public static function requireAuth() {
        try {
            return self::getCurrentUser();
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
    }

    public static function requireAdmin() {
        $user = self::requireAuth();
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Admin access required']);
            exit;
        }
        return $user;
    }

    public static function generateApiKey() {
        return bin2hex(random_bytes(32));
    }

    public static function verifyApiKey($apiKey) {
        $db = Database::getInstance();
        $seller = $db->fetchOne("SELECT s.*, u.email, u.name, u.status FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.api_key = ?", [$apiKey]);

        if (!$seller || $seller['status'] !== 'active') {
            throw new Exception('Invalid or inactive API key');
        }

        return $seller;
    }
}
