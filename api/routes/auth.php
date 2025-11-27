<?php

function handleLogin() {
    $input = getInput();

    if (empty($input['email']) || empty($input['password'])) {
        sendJson(['success' => false, 'message' => 'Email e senha obrigatórios'], 400);
    }

    $db = Database::getInstance();
    $user = $db->fetchOne("SELECT * FROM users WHERE email = ?", [$input['email']]);

    if (!$user || !password_verify($input['password'], $user['password_hash'])) {
        sendJson(['success' => false, 'message' => 'Credenciais inválidas'], 401);
    }

    if ($user['status'] !== 'active') {
        sendJson(['success' => false, 'message' => 'Conta inativa ou pendente'], 403);
    }

    $token = Auth::generateToken($user['id'], $user['email'], $user['role']);
    unset($user['password_hash']);

    $seller = null;
    if ($user['role'] === 'seller') {
        $seller = $db->fetchOne("SELECT * FROM sellers WHERE user_id = ?", [$user['id']]);
    }

    sendJson([
        'success' => true,
        'data' => [
            'user' => $user,
            'seller' => $seller,
            'token' => $token
        ]
    ]);
}

function handleMe() {
    $user = Auth::requireAuth();

    $db = Database::getInstance();
    $seller = null;

    if ($user['role'] === 'seller') {
        $seller = $db->fetchOne("SELECT * FROM sellers WHERE user_id = ?", [$user['id']]);
    }

    sendJson([
        'success' => true,
        'data' => [
            'user' => $user,
            'seller' => $seller
        ]
    ]);
}
