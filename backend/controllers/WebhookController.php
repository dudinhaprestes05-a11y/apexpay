<?php

require_once __DIR__ . '/../services/WebhookService.php';

class WebhookController {
    public function podpay(Request $request, Response $response) {
        try {
            $payload = $request->input();

            error_log('PodPay Webhook received: ' . json_encode($payload));

            $db = Database::getInstance();
            $db->insert('webhook_logs', [
                'id' => $this->generateUuid(),
                'provider' => 'podpay',
                'event_type' => $payload['event'] ?? $payload['type'] ?? 'unknown',
                'transaction_id' => $payload['data']['id'] ?? $payload['objectId'] ?? null,
                'payload_json' => json_encode($payload),
                'http_status' => 200
            ]);

            $webhookService = new WebhookService();
            $webhookService->processPodPayWebhook($payload);

            $response->success(null, 'Webhook processed successfully')->send();

        } catch (Exception $e) {
            error_log('Webhook processing error: ' . $e->getMessage());

            try {
                $db = Database::getInstance();
                $db->insert('webhook_logs', [
                    'id' => $this->generateUuid(),
                    'provider' => 'podpay',
                    'event_type' => 'error',
                    'transaction_id' => null,
                    'payload_json' => json_encode($request->input()),
                    'http_status' => 500
                ]);
            } catch (Exception $logError) {
            }

            return $response->serverError($e->getMessage())->send();
        }
    }

    private function generateUuid() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
