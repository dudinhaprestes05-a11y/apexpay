<?php

require_once __DIR__ . '/../core/Database.php';

class Wallet {
    private static function db() {
        return Database::getInstance();
    }

    public static function findByUserId($userId) {
        $sql = "SELECT * FROM wallets WHERE user_id = :user_id";
        return self::db()->fetchOne($sql, ['user_id' => $userId]);
    }

    public static function updateBalance($userId, $balance) {
        $sql = "UPDATE wallets SET balance = :balance WHERE user_id = :user_id";
        self::db()->query($sql, [
            'balance' => $balance,
            'user_id' => $userId
        ]);
    }

    public static function credit($userId, $amount) {
        $sql = "UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id";
        self::db()->query($sql, [
            'amount' => $amount,
            'user_id' => $userId
        ]);
    }

    public static function debit($userId, $amount) {
        $wallet = self::findByUserId($userId);

        if (!$wallet || $wallet['balance'] < $amount) {
            throw new Exception('Saldo insuficiente');
        }

        $sql = "UPDATE wallets SET balance = balance - :amount WHERE user_id = :user_id";
        self::db()->query($sql, [
            'amount' => $amount,
            'user_id' => $userId
        ]);
    }

    public static function freeze($userId, $amount) {
        $wallet = self::findByUserId($userId);

        if (!$wallet || $wallet['balance'] < $amount) {
            throw new Exception('Saldo insuficiente para congelar');
        }

        $sql = "UPDATE wallets
                SET balance = balance - :amount,
                    frozen_balance = frozen_balance + :amount
                WHERE user_id = :user_id";

        self::db()->query($sql, [
            'amount' => $amount,
            'user_id' => $userId
        ]);
    }

    public static function unfreeze($userId, $amount) {
        $sql = "UPDATE wallets
                SET balance = balance + :amount,
                    frozen_balance = frozen_balance - :amount
                WHERE user_id = :user_id";

        self::db()->query($sql, [
            'amount' => $amount,
            'user_id' => $userId
        ]);
    }

    public static function addFees($userId, $feeAmount) {
        $sql = "UPDATE wallets SET total_fees_paid = total_fees_paid + :fee WHERE user_id = :user_id";
        self::db()->query($sql, [
            'fee' => $feeAmount,
            'user_id' => $userId
        ]);
    }
}
