<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Wallet.php';
require_once __DIR__ . '/../models/Transaction.php';

class SellerController {
    public function dashboard(Request $request, Response $response) {
        $userId = $request->user['id'];

        try {
            $wallet = Wallet::findByUserId($userId);

            $totalTransactions = Transaction::count(['user_id' => $userId]);

            $totalVolume = Transaction::getTotalVolume(['user_id' => $userId]);

            $paidCount = Transaction::count([
                'user_id' => $userId,
                'status' => 'paid'
            ]);
            $successRate = $totalTransactions > 0
                ? round(($paidCount / $totalTransactions) * 100, 2)
                : 0;

            $recentTransactions = Transaction::findByUserId($userId, [
                'limit' => 10
            ]);

            $stats = [
                'balance' => (float)($wallet['balance'] ?? 0),
                'frozen_balance' => (float)($wallet['frozen_balance'] ?? 0),
                'total_fees_paid' => (float)($wallet['total_fees_paid'] ?? 0),
                'total_transactions' => $totalTransactions,
                'total_volume' => $totalVolume,
                'success_rate' => $successRate,
                'recent_transactions' => $recentTransactions
            ];

            $response->success($stats)->send();

        } catch (Exception $e) {
            error_log('Dashboard error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function profile(Request $request, Response $response) {
        $user = $request->user;
        unset($user['password_hash']);

        $response->success($user)->send();
    }

    public function updateProfile(Request $request, Response $response) {
        $userId = $request->user['id'];

        $allowedFields = ['name', 'document_cpf_cnpj', 'address'];
        $updateData = [];

        foreach ($allowedFields as $field) {
            if ($request->input($field) !== null) {
                $updateData[$field] = $request->input($field);
            }
        }

        if (empty($updateData)) {
            return $response->error('Nenhum dado para atualizar', 400)->send();
        }

        try {
            $user = User::update($userId, $updateData);
            unset($user['password_hash']);

            $response->success($user, 'Perfil atualizado com sucesso')->send();

        } catch (Exception $e) {
            error_log('Update profile error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }
}
