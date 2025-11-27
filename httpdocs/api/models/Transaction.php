<?php

require_once __DIR__ . '/../core/Database.php';

class Transaction {
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

        if (isset($data['metadata']) && is_array($data['metadata'])) {
            $data['metadata'] = json_encode($data['metadata']);
        }

        if (isset($data['customer_data']) && is_array($data['customer_data'])) {
            $data['customer_data'] = json_encode($data['customer_data']);
        }

        self::db()->insert('transactions', $data);

        return self::findById($data['id']);
    }

    public static function findById($id) {
        $sql = "SELECT * FROM transactions WHERE id = :id";
        return self::db()->fetchOne($sql, ['id' => $id]);
    }

    public static function findByProviderId($providerId) {
        $sql = "SELECT * FROM transactions WHERE provider_transaction_id = :provider_id";
        return self::db()->fetchOne($sql, ['provider_id' => $providerId]);
    }

    public static function findByUserId($userId, $filters = []) {
        $sql = "SELECT * FROM transactions WHERE user_id = :user_id";
        $params = ['user_id' => $userId];

        if (isset($filters['type'])) {
            $sql .= " AND type = :type";
            $params['type'] = $filters['type'];
        }

        if (isset($filters['status'])) {
            $sql .= " AND status = :status";
            $params['status'] = $filters['status'];
        }

        if (isset($filters['date_from'])) {
            $sql .= " AND created_at >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to'])) {
            $sql .= " AND created_at <= :date_to";
            $params['date_to'] = $filters['date_to'];
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

    public static function findAll($filters = []) {
        $sql = "SELECT t.*, u.name as user_name, u.email as user_email
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                WHERE 1=1";
        $params = [];

        if (isset($filters['user_id'])) {
            $sql .= " AND t.user_id = :user_id";
            $params['user_id'] = $filters['user_id'];
        }

        if (isset($filters['type'])) {
            $sql .= " AND t.type = :type";
            $params['type'] = $filters['type'];
        }

        if (isset($filters['status'])) {
            $sql .= " AND t.status = :status";
            $params['status'] = $filters['status'];
        }

        if (isset($filters['date_from'])) {
            $sql .= " AND t.created_at >= :date_from";
            $params['date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to'])) {
            $sql .= " AND t.created_at <= :date_to";
            $params['date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY t.created_at DESC";

        if (isset($filters['limit'])) {
            $sql .= " LIMIT " . (int)$filters['limit'];
            if (isset($filters['offset'])) {
                $sql .= " OFFSET " . (int)$filters['offset'];
            }
        }

        return self::db()->fetchAll($sql, $params);
    }

    public static function update($id, $data) {
        if (isset($data['metadata']) && is_array($data['metadata'])) {
            $data['metadata'] = json_encode($data['metadata']);
        }

        if (isset($data['customer_data']) && is_array($data['customer_data'])) {
            $data['customer_data'] = json_encode($data['customer_data']);
        }

        self::db()->update('transactions', $data, 'id = :id', ['id' => $id]);

        return self::findById($id);
    }

    public static function updateStatus($id, $status) {
        return self::update($id, ['status' => $status]);
    }

    public static function count($filters = []) {
        $sql = "SELECT COUNT(*) as total FROM transactions WHERE 1=1";
        $params = [];

        if (isset($filters['user_id'])) {
            $sql .= " AND user_id = :user_id";
            $params['user_id'] = $filters['user_id'];
        }

        if (isset($filters['status'])) {
            $sql .= " AND status = :status";
            $params['status'] = $filters['status'];
        }

        if (isset($filters['type'])) {
            $sql .= " AND type = :type";
            $params['type'] = $filters['type'];
        }

        $result = self::db()->fetchOne($sql, $params);
        return (int)$result['total'];
    }

    public static function getTotalVolume($filters = []) {
        $sql = "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'paid'";
        $params = [];

        if (isset($filters['user_id'])) {
            $sql .= " AND user_id = :user_id";
            $params['user_id'] = $filters['user_id'];
        }

        if (isset($filters['type'])) {
            $sql .= " AND type = :type";
            $params['type'] = $filters['type'];
        }

        $result = self::db()->fetchOne($sql, $params);
        return (float)$result['total'];
    }
}
