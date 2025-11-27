<?php

require_once __DIR__ . '/../core/Database.php';

class Deposit {
    private static function db() {
        return Database::getInstance();
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

    public static function create($data) {
        $data['id'] = self::generateUuid();
        self::db()->insert('deposits', $data);
        return self::findById($data['id']);
    }

    public static function findById($id) {
        $sql = "SELECT * FROM deposits WHERE id = :id";
        return self::db()->fetchOne($sql, ['id' => $id]);
    }

    public static function findByProviderId($providerId) {
        $sql = "SELECT * FROM deposits WHERE provider_transaction_id = :provider_id";
        return self::db()->fetchOne($sql, ['provider_id' => $providerId]);
    }

    public static function findByUserId($userId, $filters = []) {
        $sql = "SELECT * FROM deposits WHERE user_id = :user_id";
        $params = ['user_id' => $userId];

        if (isset($filters['status'])) {
            $sql .= " AND status = :status";
            $params['status'] = $filters['status'];
        }

        $sql .= " ORDER BY created_at DESC";

        if (isset($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
        }

        return self::db()->fetchAll($sql, $params);
    }

    public static function update($id, $data) {
        self::db()->update('deposits', $data, 'id = :id', ['id' => $id]);
        return self::findById($id);
    }

    public static function updateStatus($id, $status) {
        return self::update($id, ['status' => $status]);
    }
}
