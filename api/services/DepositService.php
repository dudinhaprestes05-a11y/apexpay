<?php

require_once __DIR__ . '/../models/Deposit.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/PaymentAcquirer.php';
require_once __DIR__ . '/PodPayService.php';

class DepositService {
    public function createDeposit($userId, $amount, $description = null) {
        $user = User::findById($userId);

        if (!$user) {
            throw new Exception('Usuário não encontrado');
        }

        if ($user['kyc_status'] !== 'approved') {
            throw new Exception('KYC precisa estar aprovado');
        }

        $acquirers = PaymentAcquirer::getActiveForUser($userId);

        if (empty($acquirers)) {
            throw new Exception('Nenhuma adquirente configurada para este seller');
        }

        $lastError = '';

        foreach ($acquirers as $acquirer) {
            try {
                error_log("Attempting deposit with acquirer: {$acquirer['name']}");

                $deposit = $this->tryCreateDepositWithAcquirer($acquirer, $user, $amount, $description);

                if ($deposit) {
                    return $deposit;
                }

            } catch (Exception $e) {
                $lastError = $e->getMessage();
                error_log("Failed with acquirer {$acquirer['name']}: {$lastError}");

                $this->recordAcquirerFailure($userId, $acquirer['id']);

                continue;
            }
        }

        throw new Exception("Todas as adquirentes falharam. Último erro: {$lastError}");
    }

    private function tryCreateDepositWithAcquirer($acquirer, $user, $amount, $description) {
        $podpayService = new PodPayService($acquirer);

        $podpayData = $podpayService->createPixTransaction([
            'amount' => $amount,
            'description' => $description ?? 'Depósito',
            'customer' => [
                'name' => $user['name'],
                'email' => $user['email'],
                'document' => $user['document_cpf_cnpj'] ?? '00000000000'
            ],
            'metadata' => [
                'user_id' => $user['id']
            ]
        ]);

        $qrCodeBase64 = '';
        if (isset($podpayData['pix']['qrcode'])) {
            $qrCodeBase64 = $this->generateQRCodeBase64($podpayData['pix']['qrcode']);
        }

        $expiresAt = isset($podpayData['pix']['expirationDate'])
            ? date('Y-m-d H:i:s', strtotime($podpayData['pix']['expirationDate']))
            : date('Y-m-d H:i:s', time() + 1800);

        $depositData = [
            'user_id' => $user['id'],
            'acquirer_id' => $acquirer['id'],
            'amount' => $amount,
            'status' => 'pending',
            'provider' => 'podpay',
            'provider_transaction_id' => (string)$podpayData['id'],
            'pix_qr_code' => $podpayData['pix']['qrcode'] ?? null,
            'pix_qr_code_base64' => $qrCodeBase64,
            'pix_copy_paste' => $podpayData['pix']['qrcode'] ?? null,
            'expires_at' => $expiresAt
        ];

        $deposit = Deposit::create($depositData);

        return $deposit;
    }

    private function generateQRCodeBase64($text) {
        try {
            $qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&data=' . urlencode($text);

            $ch = curl_init($qrApiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

            $imageData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $imageData) {
                return base64_encode($imageData);
            }

            return '';

        } catch (Exception $e) {
            error_log('QR Code generation error: ' . $e->getMessage());
            return '';
        }
    }

    private function recordAcquirerFailure($userId, $acquirerId) {
        $db = Database::getInstance();

        $sql = "UPDATE seller_acquirer_assignments
                SET last_failure_at = NOW(),
                    failure_count = failure_count + 1
                WHERE user_id = :user_id AND acquirer_id = :acquirer_id";

        $db->query($sql, [
            'user_id' => $userId,
            'acquirer_id' => $acquirerId
        ]);
    }
}
