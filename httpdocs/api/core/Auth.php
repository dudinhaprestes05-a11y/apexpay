<?php

class Auth {
    private static $config;

    public static function init() {
        self::$config = require __DIR__ . '/../config/app.php';
    }

    public static function generateToken($userId, $email, $role) {
        if (!self::$config) {
            self::init();
        }

        $issuedAt = time();
        $expire = $issuedAt + self::$config['jwt']['expiration'];

        $payload = [
            'iss' => self::$config['url'],
            'iat' => $issuedAt,
            'exp' => $expire,
            'sub' => $userId,
            'email' => $email,
            'role' => $role
        ];

        return self::encode($payload);
    }

    public static function generateRefreshToken($userId) {
        if (!self::$config) {
            self::init();
        }

        $issuedAt = time();
        $expire = $issuedAt + self::$config['jwt']['refresh_expiration'];

        $payload = [
            'iss' => self::$config['url'],
            'iat' => $issuedAt,
            'exp' => $expire,
            'sub' => $userId,
            'type' => 'refresh'
        ];

        return self::encode($payload);
    }

    public static function validateToken($token) {
        try {
            $payload = self::decode($token);

            if ($payload['exp'] < time()) {
                return null;
            }

            if (isset($payload['type']) && $payload['type'] === 'refresh') {
                return null;
            }

            return $payload;
        } catch (Exception $e) {
            return null;
        }
    }

    public static function validateRefreshToken($token) {
        try {
            $payload = self::decode($token);

            if ($payload['exp'] < time()) {
                return null;
            }

            if (!isset($payload['type']) || $payload['type'] !== 'refresh') {
                return null;
            }

            return $payload;
        } catch (Exception $e) {
            return null;
        }
    }

    private static function encode($payload) {
        if (!self::$config) {
            self::init();
        }

        $header = json_encode(['typ' => 'JWT', 'alg' => self::$config['jwt']['algorithm']]);
        $payload = json_encode($payload);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payload);

        $signature = hash_hmac(
            'sha256',
            $base64UrlHeader . "." . $base64UrlPayload,
            self::$config['jwt']['secret'],
            true
        );

        $base64UrlSignature = self::base64UrlEncode($signature);

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    private static function decode($jwt) {
        if (!self::$config) {
            self::init();
        }

        $parts = explode('.', $jwt);

        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }

        [$base64UrlHeader, $base64UrlPayload, $base64UrlSignature] = $parts;

        $signature = self::base64UrlDecode($base64UrlSignature);
        $expectedSignature = hash_hmac(
            'sha256',
            $base64UrlHeader . "." . $base64UrlPayload,
            self::$config['jwt']['secret'],
            true
        );

        if (!hash_equals($signature, $expectedSignature)) {
            throw new Exception('Invalid token signature');
        }

        $payload = json_decode(self::base64UrlDecode($base64UrlPayload), true);

        return $payload;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }

    public static function generateApiKey() {
        return bin2hex(random_bytes(32));
    }

    public static function hashApiKey($key) {
        return hash('sha256', $key);
    }
}
