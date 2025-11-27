<?php

require_once __DIR__ . '/../models/Transaction.php';

class TransactionController {
    public function list(Request $request, Response $response) {
        $userId = $request->user['id'];

        $filters = [
            'user_id' => $userId,
            'limit' => $request->query('limit', 50),
            'offset' => $request->query('offset', 0)
        ];

        if ($request->query('type')) {
            $filters['type'] = $request->query('type');
        }

        if ($request->query('status')) {
            $filters['status'] = $request->query('status');
        }

        if ($request->query('date_from')) {
            $filters['date_from'] = $request->query('date_from');
        }

        if ($request->query('date_to')) {
            $filters['date_to'] = $request->query('date_to');
        }

        try {
            $transactions = Transaction::findByUserId($userId, $filters);
            $total = Transaction::count(['user_id' => $userId]);

            $response->success([
                'transactions' => $transactions,
                'total' => $total,
                'limit' => (int)$filters['limit'],
                'offset' => (int)$filters['offset']
            ])->send();

        } catch (Exception $e) {
            error_log('List transactions error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function show(Request $request, Response $response) {
        $userId = $request->user['id'];
        $id = $request->param('id');

        try {
            $transaction = Transaction::findById($id);

            if (!$transaction) {
                return $response->notFound('Transação não encontrada')->send();
            }

            if ($transaction['user_id'] !== $userId && $request->user['role'] !== 'admin') {
                return $response->forbidden('Acesso negado')->send();
            }

            $response->success($transaction)->send();

        } catch (Exception $e) {
            error_log('Show transaction error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function adminList(Request $request, Response $response) {
        $filters = [
            'limit' => $request->query('limit', 50),
            'offset' => $request->query('offset', 0)
        ];

        if ($request->query('user_id')) {
            $filters['user_id'] = $request->query('user_id');
        }

        if ($request->query('type')) {
            $filters['type'] = $request->query('type');
        }

        if ($request->query('status')) {
            $filters['status'] = $request->query('status');
        }

        if ($request->query('date_from')) {
            $filters['date_from'] = $request->query('date_from');
        }

        if ($request->query('date_to')) {
            $filters['date_to'] = $request->query('date_to');
        }

        try {
            $transactions = Transaction::findAll($filters);
            $total = Transaction::count($filters);

            $response->success([
                'transactions' => $transactions,
                'total' => $total,
                'limit' => (int)$filters['limit'],
                'offset' => (int)$filters['offset']
            ])->send();

        } catch (Exception $e) {
            error_log('Admin list transactions error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }
}
