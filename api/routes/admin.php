<?php

function handleAdmin($uri, $method) {
    Auth::requireAdmin();
    $db = Database::getInstance();

    if ($uri === '/admin/dashboard' && $method === 'GET') {
        $stats = [
            'total_sellers' => $db->fetchOne("SELECT COUNT(*) as count FROM users WHERE role = 'seller'")['count'],
            'active_sellers' => $db->fetchOne("SELECT COUNT(*) as count FROM users WHERE role = 'seller' AND status = 'active'")['count'],
            'total_transactions' => $db->fetchOne("SELECT COUNT(*) as count FROM transactions")['count'],
            'paid_transactions' => $db->fetchOne("SELECT COUNT(*) as count FROM transactions WHERE status = 'paid'")['count'],
            'total_volume' => $db->fetchOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'paid'")['total'],
            'pending_withdrawals' => $db->fetchOne("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'")['count'],
        ];

        $recentTransactions = $db->fetchAll("
            SELECT t.*, s.user_id, u.name as seller_name, u.email as seller_email
            FROM transactions t
            JOIN sellers s ON t.seller_id = s.id
            JOIN users u ON s.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 10
        ");

        sendJson(['success' => true, 'data' => ['stats' => $stats, 'recent_transactions' => $recentTransactions]]);
    }

    if ($uri === '/admin/sellers' && $method === 'GET') {
        $sellers = $db->fetchAll("
            SELECT u.id, u.email, u.name, u.status, u.created_at,
                   s.id as seller_id, s.balance_available, s.balance_frozen, s.fee_percentage, s.api_key
            FROM users u
            LEFT JOIN sellers s ON u.id = s.user_id
            WHERE u.role = 'seller'
            ORDER BY u.created_at DESC
        ");
        sendJson(['success' => true, 'data' => $sellers]);
    }

    if ($uri === '/admin/sellers/create' && $method === 'POST') {
        $input = getInput();

        if (empty($input['email']) || empty($input['name']) || empty($input['password'])) {
            sendJson(['success' => false, 'message' => 'Dados incompletos'], 400);
        }

        $existing = $db->fetchOne("SELECT id FROM users WHERE email = ?", [$input['email']]);
        if ($existing) {
            sendJson(['success' => false, 'message' => 'Email já cadastrado'], 400);
        }

        $passwordHash = password_hash($input['password'], PASSWORD_BCRYPT);

        $db->query("INSERT INTO users (email, name, password_hash, role, status) VALUES (?, ?, ?, 'seller', 'active')",
            [$input['email'], $input['name'], $passwordHash]);

        $userId = $db->lastInsertId();

        $apiKey = Auth::generateApiKey();
        $apiSecret = Auth::generateApiKey();
        $fee = $input['fee_percentage'] ?? 2.00;

        $db->query("INSERT INTO sellers (user_id, api_key, api_secret, fee_percentage) VALUES (?, ?, ?, ?)",
            [$userId, $apiKey, $apiSecret, $fee]);

        sendJson(['success' => true, 'data' => ['user_id' => $userId, 'api_key' => $apiKey, 'api_secret' => $apiSecret]]);
    }

    if (preg_match('/^\/admin\/sellers\/(\d+)\/status$/', $uri, $matches) && $method === 'PUT') {
        $userId = $matches[1];
        $input = getInput();

        if (empty($input['status']) || !in_array($input['status'], ['active', 'suspended', 'pending'])) {
            sendJson(['success' => false, 'message' => 'Status inválido'], 400);
        }

        $db->query("UPDATE users SET status = ? WHERE id = ? AND role = 'seller'", [$input['status'], $userId]);
        sendJson(['success' => true, 'message' => 'Status atualizado']);
    }

    if ($uri === '/admin/withdrawals' && $method === 'GET') {
        $withdrawals = $db->fetchAll("
            SELECT w.*, u.name as seller_name, u.email as seller_email
            FROM withdrawals w
            JOIN sellers s ON w.seller_id = s.id
            JOIN users u ON s.user_id = u.id
            ORDER BY w.created_at DESC
        ");
        sendJson(['success' => true, 'data' => $withdrawals]);
    }

    if (preg_match('/^\/admin\/withdrawals\/(\d+)\/(approve|reject)$/', $uri, $matches) && $method === 'POST') {
        $withdrawalId = $matches[1];
        $action = $matches[2];
        $input = getInput();

        $withdrawal = $db->fetchOne("SELECT * FROM withdrawals WHERE id = ?", [$withdrawalId]);
        if (!$withdrawal || $withdrawal['status'] !== 'pending') {
            sendJson(['success' => false, 'message' => 'Saque não encontrado ou já processado'], 400);
        }

        $adminUser = Auth::getCurrentUser();

        if ($action === 'approve') {
            $db->query("UPDATE withdrawals SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?",
                [$adminUser['id'], $withdrawalId]);

            $db->query("UPDATE sellers SET balance_available = balance_available - ? WHERE id = ?",
                [$withdrawal['amount'], $withdrawal['seller_id']]);

            sendJson(['success' => true, 'message' => 'Saque aprovado']);
        } else {
            $notes = $input['notes'] ?? 'Rejeitado pelo administrador';
            $db->query("UPDATE withdrawals SET status = 'rejected', notes = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
                [$notes, $adminUser['id'], $withdrawalId]);

            $db->query("UPDATE sellers SET balance_frozen = balance_frozen - ? WHERE id = ?",
                [$withdrawal['amount'], $withdrawal['seller_id']]);

            sendJson(['success' => true, 'message' => 'Saque rejeitado']);
        }
    }

    sendJson(['success' => false, 'message' => 'Admin endpoint not found'], 404);
}
