<?php

class AdminMiddleware {
    public function handle(Request $request, Response $response) {
        if (!$request->user) {
            $response->unauthorized('Autenticação necessária')->send();
        }

        if ($request->user['role'] !== 'admin') {
            $response->forbidden('Acesso restrito a administradores')->send();
        }
    }
}
