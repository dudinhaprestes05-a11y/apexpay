<?php

require_once __DIR__ . '/../core/Database.php';

class PaymentAcquirer {
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

    public static function findById($id) {
        $sql = "SELECT * FROM payment_acquirers WHERE id = :id";
        return self::db()->fetchOne($sql, ['id' => $id]);
    }

    public static function findAll($activeOnly = false) {
        $sql = "SELECT * FROM payment_acquirers";

        if ($activeOnly) {
            $sql .= " WHERE is_active = 1";
        }

        $sql .= " ORDER BY name ASC";

        return self::db()->fetchAll($sql);
    }

    public static function create($data) {
        $data['id'] = self::generateUuid();
        self::db()->insert('payment_acquirers', $data);
        return self::findById($data['id']);
    }

    public static function update($id, $data) {
        self::db()->update('payment_acquirers', $data, 'id = :id', ['id' => $id]);
        return self::findById($id);
    }

    public static function delete($id) {
        self::db()->delete('payment_acquirers', 'id = :id', ['id' => $id]);
    }

    public static function getActiveForUser($userId) {
        $sql = "SELECT pa.*
                FROM payment_acquirers pa
                JOIN seller_acquirer_assignments saa ON pa.id = saa.acquirer_id
                WHERE saa.user_id = :user_id
                AND saa.is_active = 1
                AND pa.is_active = 1
                ORDER BY saa.priority ASC, saa.weight DESC";

        return self::db()->fetchAll($sql, ['user_id' => $userId]);
    }
}
