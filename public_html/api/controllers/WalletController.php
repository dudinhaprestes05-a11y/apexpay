<?php

require_once __DIR__ . '/../models/Wallet.php';

class WalletController {
    public function getWallet(Request $request, Response $response) {
        $userId = $request->user['id'];

        try {
            $wallet = Wallet::findByUserId($userId);

            if (!$wallet) {
                return $response->notFound('Carteira não encontrada')->send();
            }

            $response->success($wallet)->send();

        } catch (Exception $e) {
            error_log('Get wallet error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function getHistory(Request $request, Response $response) {
        $userId = $request->user['id'];
        $limit = $request->query('limit', 50);
        $offset = $request->query('offset', 0);

        try {
            $transactions = Transaction::findByUserId($userId, [
                'limit' => $limit,
                'offset' => $offset
            ]);

            $total = Transaction::count(['user_id' => $userId]);

            $response->success([
                'transactions' => $transactions,
                'total' => $total,
                'limit' => (int)$limit,
                'offset' => (int)$offset
            ])->send();

        } catch (Exception $e) {
            error_log('Get history error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }
}
