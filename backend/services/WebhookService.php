<?php

require_once __DIR__ . '/../models/Transaction.php';
require_once __DIR__ . '/../models/Deposit.php';
require_once __DIR__ . '/../models/Wallet.php';

class WebhookService {
    public function processPodPayWebhook($payload) {
        $eventType = $payload['event'] ?? $payload['type'] ?? 'unknown';
        $transactionId = isset($payload['data']['id']) ? (string)$payload['data']['id'] : (string)($payload['objectId'] ?? '');

        if (!$transactionId) {
            error_log('No transaction ID found in webhook payload');
            return;
        }

        $eventStatus = isset($payload['data']['status']) ? strtolower($payload['data']['status']) : '';

        error_log("Processing webhook for transaction {$transactionId} with status: {$eventStatus}");

        $transaction = Transaction::findByProviderId($transactionId);
        $deposit = Deposit::findByProviderId($transactionId);

        if ($transaction) {
            $this->processTransactionWebhook($transaction, $eventStatus, $payload);
        } elseif ($deposit) {
            $this->processDepositWebhook($deposit, $eventStatus, $payload);
        } else {
            error_log("Neither transaction nor deposit found for provider ID: {$transactionId}");
        }
    }

    private function processTransactionWebhook($transaction, $status, $payload) {
        $db = Database::getInstance();

        try {
            $db->beginTransaction();

            switch ($status) {
                case 'paid':
                    $this->handleTransactionPaid($transaction, $payload);
                    break;

                case 'refused':
                case 'rejected':
                    Transaction::updateStatus($transaction['id'], 'refused');
                    break;

                case 'cancelled':
                case 'canceled':
                    Transaction::updateStatus($transaction['id'], 'cancelled');
                    break;

                case 'refunded':
                    $this->handleTransactionRefunded($transaction);
                    break;

                default:
                    error_log("Unknown transaction status: {$status}");
            }

            $db->commit();

        } catch (Exception $e) {
            $db->rollback();
            error_log('Transaction webhook processing error: ' . $e->getMessage());
            throw $e;
        }
    }

    private function handleTransactionPaid($transaction, $payload) {
        if ($transaction['status'] === 'paid') {
            error_log('Transaction already paid, skipping');
            return;
        }

        Transaction::update($transaction['id'], [
            'status' => 'paid',
            'end_to_end_id' => $payload['data']['pix']['end2EndId'] ?? null
        ]);

        $amountToCredit = $transaction['net_amount'] > 0
            ? (float)$transaction['net_amount']
            : (float)$transaction['amount'];

        Wallet::credit($transaction['user_id'], $amountToCredit);

        if ($transaction['fee_amount'] > 0) {
            Wallet::addFees($transaction['user_id'], (float)$transaction['fee_amount']);
        }

        error_log("Transaction {$transaction['id']} paid. Credited {$amountToCredit} to wallet");
    }

    private function handleTransactionRefunded($transaction) {
        if ($transaction['status'] !== 'paid') {
            error_log('Transaction was not paid, nothing to refund');
            return;
        }

        $amountToDebit = $transaction['net_amount'] > 0
            ? (float)$transaction['net_amount']
            : (float)$transaction['amount'];

        $wallet = Wallet::findByUserId($transaction['user_id']);

        if ($wallet && $wallet['balance'] >= $amountToDebit) {
            Wallet::freeze($transaction['user_id'], $amountToDebit);
        }

        Transaction::updateStatus($transaction['id'], 'refunded');

        error_log("Transaction {$transaction['id']} refunded");
    }

    private function processDepositWebhook($deposit, $status, $payload) {
        $db = Database::getInstance();

        try {
            $db->beginTransaction();

            switch ($status) {
                case 'paid':
                    $this->handleDepositPaid($deposit, $payload);
                    break;

                case 'expired':
                case 'cancelled':
                case 'canceled':
                    Deposit::updateStatus($deposit['id'], 'expired');
                    break;

                default:
                    error_log("Unknown deposit status: {$status}");
            }

            $db->commit();

        } catch (Exception $e) {
            $db->rollback();
            error_log('Deposit webhook processing error: ' . $e->getMessage());
            throw $e;
        }
    }

    private function handleDepositPaid($deposit, $payload) {
        if ($deposit['status'] === 'paid') {
            error_log('Deposit already paid, skipping');
            return;
        }

        $paidAt = isset($payload['data']['paidAt'])
            ? date('Y-m-d H:i:s', strtotime($payload['data']['paidAt']))
            : date('Y-m-d H:i:s');

        Deposit::update($deposit['id'], [
            'status' => 'paid',
            'paid_at' => $paidAt
        ]);

        Wallet::credit($deposit['user_id'], (float)$deposit['amount']);

        error_log("Deposit {$deposit['id']} paid. Credited {$deposit['amount']} to wallet");
    }
}
