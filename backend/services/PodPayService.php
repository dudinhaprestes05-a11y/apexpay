<?php

class PodPayService {
    private $baseUrl;
    private $publicKey;
    private $secretKey;
    private $webhookUrl;

    public function __construct($acquirer) {
        $this->publicKey = $acquirer['public_key'];
        $this->secretKey = $acquirer['secret_key'];

        $this->baseUrl = $acquirer['environment'] === 'production'
            ? 'https://api.podpay.co'
            : 'https://sandbox.podpay.co';

        $config = require __DIR__ . '/../config/app.php';
        $this->webhookUrl = $config['url'] . '/api/webhooks/podpay';
    }

    public function createPixTransaction($data) {
        $amountInCents = (int)round($data['amount'] * 100);

        $payload = [
            'amount' => $amountInCents,
            'paymentMethod' => 'pix',
            'items' => [
                [
                    'title' => $data['description'] ?? 'Depósito',
                    'unitPrice' => $amountInCents,
                    'quantity' => 1,
                    'tangible' => false
                ]
            ],
            'customer' => [
                'name' => $data['customer']['name'],
                'email' => $data['customer']['email'],
                'document' => [
                    'number' => preg_replace('/[^0-9]/', '', $data['customer']['document']),
                    'type' => strlen(preg_replace('/[^0-9]/', '', $data['customer']['document'])) === 14 ? 'cnpj' : 'cpf'
                ]
            ],
            'postbackUrl' => $this->webhookUrl
        ];

        if (isset($data['metadata'])) {
            $payload['metadata'] = $data['metadata'];
        }

        return $this->makeRequest('POST', '/v1/transactions', $payload);
    }

    public function getTransaction($transactionId) {
        return $this->makeRequest('GET', "/v1/transactions/{$transactionId}");
    }

    public function cancelTransaction($transactionId) {
        return $this->makeRequest('POST', "/v1/transactions/{$transactionId}/cancel");
    }

    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;

        $ch = curl_init($url);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_setopt($ch, CURLOPT_USERPWD, $this->publicKey . ':' . $this->secretKey);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            }
        }

        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: {$error}");
        }

        $result = json_decode($response, true);

        if ($httpCode >= 400) {
            $errorMessage = $result['message'] ?? $result['error'] ?? 'PodPay API error';
            throw new Exception("PodPay API error ({$httpCode}): {$errorMessage}");
        }

        return $result;
    }
}
