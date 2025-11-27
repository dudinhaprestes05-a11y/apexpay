<?php

require_once __DIR__ . '/../models/Deposit.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../services/DepositService.php';

class DepositController {
    public function create(Request $request, Response $response) {
        $userId = $request->user['id'];

        $validator = new Validator($request->input(), [
            'amount' => 'required|numeric'
        ]);

        if (!$validator->validate()) {
            return $response->validationError($validator->errors())->send();
        }

        $amount = (float)$request->input('amount');

        if ($amount < 1) {
            return $response->error('Valor mínimo é R$ 1,00', 400)->send();
        }

        $user = User::findById($userId);

        if ($user['kyc_status'] !== 'approved') {
            return $response->error('KYC precisa estar aprovado para criar depósitos', 400)->send();
        }

        try {
            $depositService = new DepositService();
            $deposit = $depositService->createDeposit($userId, $amount, $request->input('description'));

            if (!$deposit) {
                return $response->error('Erro ao criar depósito. Verifique se há adquirentes configuradas.', 500)->send();
            }

            $response->created($deposit, 'Depósito criado com sucesso')->send();

        } catch (Exception $e) {
            error_log('Create deposit error: ' . $e->getMessage());
            return $response->error($e->getMessage(), 500)->send();
        }
    }

    public function list(Request $request, Response $response) {
        $userId = $request->user['id'];

        $filters = [
            'limit' => $request->query('limit', 50)
        ];

        if ($request->query('status')) {
            $filters['status'] = $request->query('status');
        }

        try {
            $deposits = Deposit::findByUserId($userId, $filters);

            $response->success($deposits)->send();

        } catch (Exception $e) {
            error_log('List deposits error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }

    public function show(Request $request, Response $response) {
        $userId = $request->user['id'];
        $id = $request->param('id');

        try {
            $deposit = Deposit::findById($id);

            if (!$deposit) {
                return $response->notFound('Depósito não encontrado')->send();
            }

            if ($deposit['user_id'] !== $userId && $request->user['role'] !== 'admin') {
                return $response->forbidden('Acesso negado')->send();
            }

            $response->success($deposit)->send();

        } catch (Exception $e) {
            error_log('Show deposit error: ' . $e->getMessage());
            return $response->serverError()->send();
        }
    }
}
