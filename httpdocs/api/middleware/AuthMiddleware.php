<?php

require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../models/User.php';

class AuthMiddleware {
    public function handle(Request $request, Response $response) {
        $token = $request->bearerToken();

        if (!$token) {
            $response->unauthorized('Token não fornecido')->send();
        }

        $payload = Auth::validateToken($token);

        if (!$payload) {
            $response->unauthorized('Token inválido ou expirado')->send();
        }

        $user = User::findById($payload['sub']);

        if (!$user) {
            $response->unauthorized('Usuário não encontrado')->send();
        }

        $request->user = $user;
    }
}
