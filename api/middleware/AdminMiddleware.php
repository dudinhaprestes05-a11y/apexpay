<?php

class AdminMiddleware {
    public function handle(Request $request, Response $response) {
        error_log('AdminMiddleware: Starting');
        error_log('AdminMiddleware: User = ' . ($request->user ? json_encode($request->user) : 'null'));

        if (!$request->user) {
            error_log('AdminMiddleware: No user, sending 401');
            $response->unauthorized('Autenticação necessária')->send();
        }

        error_log('AdminMiddleware: User role = ' . $request->user['role']);
        if ($request->user['role'] !== 'admin') {
            error_log('AdminMiddleware: Not admin, sending 403');
            $response->forbidden('Acesso restrito a administradores')->send();
        }

        error_log('AdminMiddleware: Success');
    }
}
