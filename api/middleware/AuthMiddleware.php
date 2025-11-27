<?php

require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    public function handle(Request $request, Response $response) {
        error_log('AuthMiddleware: Starting');
        $token = $request->bearerToken();
        error_log('AuthMiddleware: Token = ' . ($token ? 'present' : 'missing'));

        if (!$token) {
            error_log('AuthMiddleware: No token, sending 401');
            $response->unauthorized('Token não fornecido')->send();
        }

        $payload = Auth::validateToken($token);
        error_log('AuthMiddleware: Payload = ' . json_encode($payload));

        if (!$payload) {
            error_log('AuthMiddleware: Invalid token, sending 401');
            $response->unauthorized('Token inválido ou expirado')->send();
        }

        $user = User::findById($payload['sub']);
        error_log('AuthMiddleware: User found = ' . ($user ? 'yes' : 'no'));

        if (!$user) {
            error_log('AuthMiddleware: User not found, sending 401');
            $response->unauthorized('Usuário não encontrado')->send();
        }

        error_log('AuthMiddleware: Success, user role = ' . $user['role']);
        $request->user = $user;
    }
}
