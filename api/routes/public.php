<?php

function handlePublic($uri, $method) {
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $headers['x-api-key'] ?? '';

    if (empty($apiKey)) {
        sendJson(['success' => false, 'message' => 'API Key required'], 401);
    }

    try {
        $seller = Auth::verifyApiKey($apiKey);
    } catch (Exception $e) {
        sendJson(['success' => false, 'message' => $e->getMessage()], 401);
    }

    $db = Database::getInstance();

    if ($uri === '/v1/charges' && $method === 'POST') {
        $input = getInput();

        if (empty($input['amount']) || $input['amount'] <= 0) {
            sendJson(['success' => false, 'message' => 'Invalid amount'], 400);
        }

        $amount = $input['amount'];
        $externalId = $input['external_id'] ?? null;
        $description = $input['description'] ?? '';
        $metadata = isset($input['metadata']) ? json_encode($input['metadata']) : null;

        if ($externalId) {
            $existing = $db->fetchOne("SELECT id FROM transactions WHERE seller_id = ? AND external_id = ?", [$seller['id'], $externalId]);
            if ($existing) {
                sendJson(['success' => false, 'message' => 'Duplicate external_id'], 400);
            }
        }

        $fee = $amount * ($seller['fee_percentage'] / 100);
        $netAmount = $amount - $fee;

        $pixKey = $seller['pix_key'] ?: getenv('DEFAULT_PIX_KEY');
        $pixName = $seller['name'];

        $pixData = PIX::generateQRCode($amount, $pixKey, $pixName);

        $expiresAt = date('Y-m-d H:i:s', time() + 3600);

        $db->query("
            INSERT INTO transactions (seller_id, external_id, amount, fee, net_amount, status, pix_code, pix_qrcode, description, metadata, expires_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
        ", [$seller['id'], $externalId, $amount, $fee, $netAmount, $pixData['copy_paste'], $pixData['qr_code_base64'], $description, $metadata, $expiresAt]);

        $transactionId = $db->lastInsertId();

        sendJson([
            'success' => true,
            'data' => [
                'id' => $transactionId,
                'amount' => $amount,
                'status' => 'pending',
                'pix_code' => $pixData['copy_paste'],
                'pix_qrcode' => $pixData['qr_code_base64'],
                'expires_at' => $expiresAt,
                'created_at' => date('Y-m-d H:i:s')
            ]
        ]);
    }

    if (preg_match('/^\/v1\/charges\/(\d+)$/', $uri, $matches) && $method === 'GET') {
        $transactionId = $matches[1];

        $transaction = $db->fetchOne("SELECT * FROM transactions WHERE id = ? AND seller_id = ?", [$transactionId, $seller['id']]);

        if (!$transaction) {
            sendJson(['success' => false, 'message' => 'Transaction not found'], 404);
        }

        unset($transaction['pix_qrcode']);

        sendJson(['success' => true, 'data' => $transaction]);
    }

    if (preg_match('/^\/v1\/charges\/(\d+)\/confirm$/', $uri, $matches) && $method === 'POST') {
        $transactionId = $matches[1];
        $input = getInput();

        $transaction = $db->fetchOne("SELECT * FROM transactions WHERE id = ? AND seller_id = ?", [$transactionId, $seller['id']]);

        if (!$transaction) {
            sendJson(['success' => false, 'message' => 'Transaction not found'], 404);
        }

        if ($transaction['status'] !== 'pending') {
            sendJson(['success' => false, 'message' => 'Transaction already processed'], 400);
        }

        $payerName = $input['payer_name'] ?? '';
        $payerDocument = $input['payer_document'] ?? '';

        $db->query("UPDATE transactions SET status = 'paid', payer_name = ?, payer_document = ?, paid_at = NOW() WHERE id = ?",
            [$payerName, $payerDocument, $transactionId]);

        $db->query("UPDATE sellers SET balance_available = balance_available + ? WHERE id = ?",
            [$transaction['net_amount'], $seller['id']]);

        if ($seller['webhook_url']) {
            $webhookPayload = [
                'event' => 'charge.paid',
                'data' => [
                    'id' => $transaction['id'],
                    'external_id' => $transaction['external_id'],
                    'amount' => $transaction['amount'],
                    'status' => 'paid',
                    'paid_at' => date('Y-m-d H:i:s')
                ]
            ];

            $db->query("INSERT INTO webhook_logs (seller_id, transaction_id, url, payload, status) VALUES (?, ?, ?, ?, 'pending')",
                [$seller['id'], $transaction['id'], $seller['webhook_url'], json_encode($webhookPayload)]);
        }

        sendJson(['success' => true, 'message' => 'Payment confirmed']);
    }

    sendJson(['success' => false, 'message' => 'API endpoint not found'], 404);
}
