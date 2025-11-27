<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Transaction.php';
require_once __DIR__ . '/../models/PaymentAcquirer.php';

class AdminController {
    public function dashboard(Request $request, Response $response) {
        try {
            $totalSellers = User::count(['role' => 'seller']);
            $pendingKYC = User::count(['kyc_status' => 'pending']);

            $totalTransactions = Transaction::count();
            $totalVolume = Transaction::getTotalVolume();

            $paidCount = Transaction::count(['status' => 'paid']);
            $successRate = $totalTransactions > 0
                ? round(($paidCount / $totalTransactions) * 100, 2)
                : 0;

            $stats = [
                'total_sellers' => $totalSellers,
                'pending_kyc' => $pendingKYC,
                'total_transactions' => $totalTransactions,
                'total_volume' => $totalVolume,
                'success_rate' => $successRate
            ];

            $response->success($stats)->send();

        } catch (Exception $e) {
            error_log('Admin dashboard error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function listSellers(Request $request, Response $response) {
        $filters = [
            'role' => 'seller',
            'limit' => $request->query('limit', 50),
            'offset' => $request->query('offset', 0)
        ];

        if ($request->query('kyc_status')) {
            $filters['kyc_status'] = $request->query('kyc_status');
        }

        if ($request->query('search')) {
            $filters['search'] = $request->query('search');
        }

        try {
            $sellers = User::findAll($filters);
            $total = User::count(['role' => 'seller']);

            foreach ($sellers as &$seller) {
                unset($seller['password_hash']);
            }

            $response->success([
                'sellers' => $sellers,
                'total' => $total,
                'limit' => (int)$filters['limit'],
                'offset' => (int)$filters['offset']
            ])->send();

        } catch (Exception $e) {
            error_log('List sellers error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function showSeller(Request $request, Response $response) {
        $id = $request->param('id');

        try {
            $seller = User::findById($id);

            if (!$seller || $seller['role'] !== 'seller') {
                return $response->notFound('Seller não encontrado')->send();
            }

            unset($seller['password_hash']);

            $wallet = Wallet::findByUserId($id);
            $seller['wallet'] = $wallet;

            $response->success($seller)->send();

        } catch (Exception $e) {
            error_log('Show seller error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function updateSeller(Request $request, Response $response) {
        $id = $request->param('id');

        $allowedFields = ['name', 'kyc_status', 'rejection_reason'];
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
            $seller = User::update($id, $updateData);
            unset($seller['password_hash']);

            $response->success($seller, 'Seller atualizado com sucesso')->send();

        } catch (Exception $e) {
            error_log('Update seller error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function listAcquirers(Request $request, Response $response) {
        try {
            $acquirers = PaymentAcquirer::findAll();

            $response->success($acquirers)->send();

        } catch (Exception $e) {
            error_log('List acquirers error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function createAcquirer(Request $request, Response $response) {
        $validator = new Validator($request->input(), [
            'name' => 'required',
            'public_key' => 'required',
            'secret_key' => 'required',
            'environment' => 'required|in:sandbox,production'
        ]);

        if (!$validator->validate()) {
            return $response->validationError($validator->errors())->send();
        }

        try {
            $data = [
                'name' => $request->input('name'),
                'provider_type' => $request->input('provider_type', 'podpay'),
                'public_key' => $request->input('public_key'),
                'secret_key' => $request->input('secret_key'),
                'environment' => $request->input('environment'),
                'webhook_url' => $request->input('webhook_url'),
                'is_active' => $request->input('is_active', true)
            ];

            $acquirer = PaymentAcquirer::create($data);

            $response->created($acquirer, 'Adquirente criada com sucesso')->send();

        } catch (Exception $e) {
            error_log('Create acquirer error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function updateAcquirer(Request $request, Response $response) {
        $id = $request->param('id');

        $allowedFields = ['name', 'public_key', 'secret_key', 'environment', 'webhook_url', 'is_active'];
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
            $acquirer = PaymentAcquirer::update($id, $updateData);

            $response->success($acquirer, 'Adquirente atualizada com sucesso')->send();

        } catch (Exception $e) {
            error_log('Update acquirer error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function deleteAcquirer(Request $request, Response $response) {
        $id = $request->param('id');

        try {
            PaymentAcquirer::delete($id);

            $response->success(null, 'Adquirente removida com sucesso')->send();

        } catch (Exception $e) {
            error_log('Delete acquirer error: ' . $e->getMessage());
            return $response->error('Erro ao remover adquirente. Verifique se não há sellers vinculados.', 500)->send();
        }
    }

    public function webhookLogs(Request $request, Response $response) {
        $limit = $request->query('limit', 100);
        $offset = $request->query('offset', 0);

        try {
            $db = Database::getInstance();

            $sql = "SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
            $logs = $db->fetchAll($sql, [
                'limit' => (int)$limit,
                'offset' => (int)$offset
            ]);

            $countSql = "SELECT COUNT(*) as total FROM webhook_logs";
            $countResult = $db->fetchOne($countSql);
            $total = (int)$countResult['total'];

            $response->success([
                'logs' => $logs,
                'total' => $total,
                'limit' => (int)$limit,
                'offset' => (int)$offset
            ])->send();

        } catch (Exception $e) {
            error_log('Webhook logs error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }
}
