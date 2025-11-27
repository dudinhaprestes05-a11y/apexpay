<?php

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/SellerController.php';
require_once __DIR__ . '/../controllers/WalletController.php';
require_once __DIR__ . '/../controllers/TransactionController.php';
require_once __DIR__ . '/../controllers/DepositController.php';
require_once __DIR__ . '/../controllers/WebhookController.php';
require_once __DIR__ . '/../controllers/AdminController.php';

$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/refresh', [AuthController::class, 'refresh']);

$router->post('/api/webhooks/podpay', [WebhookController::class, 'podpay']);

$router->group(['prefix' => '/api/seller', 'middleware' => 'auth'], function($router) {
    $router->get('/dashboard', [SellerController::class, 'dashboard']);
    $router->get('/profile', [SellerController::class, 'profile']);
    $router->put('/profile', [SellerController::class, 'updateProfile']);

    $router->get('/wallet', [WalletController::class, 'getWallet']);
    $router->get('/wallet/history', [WalletController::class, 'getHistory']);

    $router->get('/transactions', [TransactionController::class, 'list']);
    $router->get('/transactions/{id}', [TransactionController::class, 'show']);

    $router->get('/deposits', [DepositController::class, 'list']);
    $router->post('/deposits', [DepositController::class, 'create']);
    $router->get('/deposits/{id}', [DepositController::class, 'show']);
});

$router->group(['prefix' => '/api/admin', 'middleware' => ['auth', 'admin']], function($router) {
    $router->get('/dashboard', [AdminController::class, 'dashboard']);

    $router->get('/sellers', [AdminController::class, 'listSellers']);
    $router->get('/sellers/{id}', [AdminController::class, 'showSeller']);
    $router->put('/sellers/{id}', [AdminController::class, 'updateSeller']);

    $router->get('/transactions', [TransactionController::class, 'adminList']);

    $router->get('/acquirers', [AdminController::class, 'listAcquirers']);
    $router->post('/acquirers', [AdminController::class, 'createAcquirer']);
    $router->put('/acquirers/{id}', [AdminController::class, 'updateAcquirer']);
    $router->delete('/acquirers/{id}', [AdminController::class, 'deleteAcquirer']);

    $router->get('/webhooks/logs', [AdminController::class, 'webhookLogs']);
});
