<?php

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Auth.php';

class User {
    private static function db() {
        return Database::getInstance();
    }

    public static function findById($id) {
        $sql = "SELECT * FROM users WHERE id = :id";
        return self::db()->fetchOne($sql, ['id' => $id]);
    }

    public static function findByEmail($email) {
        $sql = "SELECT * FROM users WHERE email = :email";
        return self::db()->fetchOne($sql, ['email' => $email]);
    }

    public static function create($data) {
        $data['password_hash'] = Auth::hashPassword($data['password']);
        unset($data['password']);

        $data['id'] = self::generateUuid();
        $data['role'] = $data['role'] ?? 'seller';
        $data['kyc_status'] = $data['kyc_status'] ?? 'pending';

        if (isset($data['address']) && is_array($data['address'])) {
            $data['address'] = json_encode($data['address']);
        }

        self::db()->insert('users', $data);

        return self::findById($data['id']);
    }

    public static function update($id, $data) {
        if (isset($data['password'])) {
            $data['password_hash'] = Auth::hashPassword($data['password']);
            unset($data['password']);
        }

        if (isset($data['address']) && is_array($data['address'])) {
            $data['address'] = json_encode($data['address']);
        }

        self::db()->update('users', $data, 'id = :id', ['id' => $id]);

        return self::findById($id);
    }

    public static function authenticate($email, $password) {
        $user = self::findByEmail($email);

        if (!$user || !Auth::verifyPassword($password, $user['password_hash'])) {
            return null;
        }

        return $user;
    }

    public static function findAll($filters = []) {
        $sql = "SELECT * FROM users WHERE 1=1";
        $params = [];

        if (isset($filters['role'])) {
            $sql .= " AND role = :role";
            $params['role'] = $filters['role'];
        }

        if (isset($filters['kyc_status'])) {
            $sql .= " AND kyc_status = :kyc_status";
            $params['kyc_status'] = $filters['kyc_status'];
        }

        if (isset($filters['search'])) {
            $sql .= " AND (name LIKE :search OR email LIKE :search OR document_cpf_cnpj LIKE :search)";
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY created_at DESC";

        if (isset($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
            if (isset($filters['offset'])) {
                $sql .= " OFFSET " . (int)$filters['offset'];
            }
        }

        return self::db()->fetchAll($sql, $params);
    }

    public static function count($filters = []) {
        $sql = "SELECT COUNT(*) as total FROM users WHERE 1=1";
        $params = [];

        if (isset($filters['role'])) {
            $sql .= " AND role = :role";
            $params['role'] = $filters['role'];
        }

        if (isset($filters['kyc_status'])) {
            $sql .= " AND kyc_status = :kyc_status";
            $params['kyc_status'] = $filters['kyc_status'];
        }

        $result = self::db()->fetchOne($sql, $params);
        return (int)$result['total'];
    }

    private static function generateUuid() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
