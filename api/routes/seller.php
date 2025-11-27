<?php

function handleSeller($uri, $method) {
    $user = Auth::requireAuth();

    if ($user['role'] !== 'seller') {
        sendJson(['success' => false, 'message' => 'Acesso negado'], 403);
    }

    $db = Database::getInstance();
    $seller = $db->fetchOne("SELECT * FROM sellers WHERE user_id = ?", [$user['id']]);

    if (!$seller) {
        sendJson(['success' => false, 'message' => 'Seller não encontrado'], 404);
    }

    if ($uri === '/seller/dashboard' && $method === 'GET') {
        $stats = [
            'balance_available' => $seller['balance_available'],
            'balance_frozen' => $seller['balance_frozen'],
            'total_transactions' => $db->fetchOne("SELECT COUNT(*) as count FROM transactions WHERE seller_id = ?", [$seller['id']])['count'],
            'paid_transactions' => $db->fetchOne("SELECT COUNT(*) as count FROM transactions WHERE seller_id = ? AND status = 'paid'", [$seller['id']])['count'],
            'total_volume' => $db->fetchOne("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE seller_id = ? AND status = 'paid'", [$seller['id']])['total'],
            'pending_withdrawals' => $db->fetchOne("SELECT COUNT(*) as count FROM withdrawals WHERE seller_id = ? AND status = 'pending'", [$seller['id']])['count'],
        ];

        sendJson(['success' => true, 'data' => $stats]);
    }

    if ($uri === '/seller/transactions' && $method === 'GET') {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = 20;
        $offset = ($page - 1) * $limit;

        $transactions = $db->fetchAll("
            SELECT * FROM transactions
            WHERE seller_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ", [$seller['id'], $limit, $offset]);

        $total = $db->fetchOne("SELECT COUNT(*) as count FROM transactions WHERE seller_id = ?", [$seller['id']])['count'];

        sendJson(['success' => true, 'data' => ['transactions' => $transactions, 'total' => $total, 'page' => $page, 'pages' => ceil($total / $limit)]]);
    }

    if ($uri === '/seller/withdrawals' && $method === 'GET') {
        $withdrawals = $db->fetchAll("SELECT * FROM withdrawals WHERE seller_id = ? ORDER BY created_at DESC", [$seller['id']]);
        sendJson(['success' => true, 'data' => $withdrawals]);
    }

    if ($uri === '/seller/withdrawals/request' && $method === 'POST') {
        $input = getInput();

        if (empty($input['amount']) || $input['amount'] <= 0) {
            sendJson(['success' => false, 'message' => 'Valor inválido'], 400);
        }

        if ($input['amount'] > $seller['balance_available']) {
            sendJson(['success' => false, 'message' => 'Saldo insuficiente'], 400);
        }

        if (empty($input['pix_key']) || empty($input['pix_key_type'])) {
            sendJson(['success' => false, 'message' => 'Chave PIX obrigatória'], 400);
        }

        $fee = $input['amount'] * 0.01;
        $netAmount = $input['amount'] - $fee;

        $db->query("INSERT INTO withdrawals (seller_id, amount, fee, net_amount, pix_key, pix_key_type, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
            [$seller['id'], $input['amount'], $fee, $netAmount, $input['pix_key'], $input['pix_key_type']]);

        $db->query("UPDATE sellers SET balance_available = balance_available - ?, balance_frozen = balance_frozen + ? WHERE id = ?",
            [$input['amount'], $input['amount'], $seller['id']]);

        sendJson(['success' => true, 'message' => 'Saque solicitado com sucesso']);
    }

    if ($uri === '/seller/api-keys' && $method === 'GET') {
        sendJson(['success' => true, 'data' => ['api_key' => $seller['api_key'], 'api_secret' => $seller['api_secret']]]);
    }

    if ($uri === '/seller/api-keys/regenerate' && $method === 'POST') {
        $newApiKey = Auth::generateApiKey();
        $newApiSecret = Auth::generateApiKey();

        $db->query("UPDATE sellers SET api_key = ?, api_secret = ? WHERE id = ?", [$newApiKey, $newApiSecret, $seller['id']]);

        sendJson(['success' => true, 'data' => ['api_key' => $newApiKey, 'api_secret' => $newApiSecret]]);
    }

    if ($uri === '/seller/settings' && $method === 'PUT') {
        $input = getInput();

        $updates = [];
        $params = [];

        if (isset($input['webhook_url'])) {
            $updates[] = 'webhook_url = ?';
            $params[] = $input['webhook_url'];
        }

        if (isset($input['pix_key'])) {
            $updates[] = 'pix_key = ?';
            $params[] = $input['pix_key'];
        }

        if (isset($input['pix_key_type'])) {
            $updates[] = 'pix_key_type = ?';
            $params[] = $input['pix_key_type'];
        }

        if (!empty($updates)) {
            $params[] = $seller['id'];
            $db->query("UPDATE sellers SET " . implode(', ', $updates) . " WHERE id = ?", $params);
        }

        sendJson(['success' => true, 'message' => 'Configurações atualizadas']);
    }

    sendJson(['success' => false, 'message' => 'Seller endpoint not found'], 404);
}
