<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../core/Auth.php';
require_once __DIR__ . '/../core/Validator.php';

class AuthController {
    public function login(Request $request, Response $response) {
        error_log('Login attempt - Input: ' . json_encode($request->input()));
        error_log('Login attempt - All: ' . json_encode($request->all()));

        $validator = new Validator($request->input(), [
            'email' => 'required|email',
            'password' => 'required|min:6'
        ]);

        if (!$validator->validate()) {
            error_log('Validation failed: ' . json_encode($validator->errors()));
            return $response->validationError($validator->errors())->send();
        }

        $email = $request->input('email');
        $password = $request->input('password');

        $user = User::authenticate($email, $password);

        if (!$user) {
            return $response->unauthorized('Credenciais inválidas')->send();
        }

        $token = Auth::generateToken($user['id'], $user['email'], $user['role']);
        $refreshToken = Auth::generateRefreshToken($user['id']);

        unset($user['password_hash']);

        $response->success([
            'user' => $user,
            'token' => $token,
            'refresh_token' => $refreshToken,
            'expires_in' => 86400
        ], 'Login realizado com sucesso')->send();
    }

    public function register(Request $request, Response $response) {
        $validator = new Validator($request->input(), [
            'email' => 'required|email',
            'password' => 'required|min:6',
            'name' => 'required|min:3',
            'document_cpf_cnpj' => 'required|cpfCnpj'
        ]);

        if (!$validator->validate()) {
            return $response->validationError($validator->errors())->send();
        }

        $existingUser = User::findByEmail($request->input('email'));
        if ($existingUser) {
            return $response->error('Email já cadastrado', 400)->send();
        }

        try {
            $userData = [
                'email' => $request->input('email'),
                'password' => $request->input('password'),
                'name' => $request->input('name'),
                'document_cpf_cnpj' => $request->input('document_cpf_cnpj'),
                'role' => 'seller',
                'kyc_status' => 'pending'
            ];

            $user = User::create($userData);

            unset($user['password_hash']);

            $token = Auth::generateToken($user['id'], $user['email'], $user['role']);
            $refreshToken = Auth::generateRefreshToken($user['id']);

            $response->created([
                'user' => $user,
                'token' => $token,
                'refresh_token' => $refreshToken
            ], 'Cadastro realizado com sucesso')->send();

        } catch (Exception $e) {
            error_log('Registration error: ' . $e->getMessage());
            return $response->serverError('Erro ao criar usuário')->send();
        }
    }

    public function refresh(Request $request, Response $response) {
        $refreshToken = $request->input('refresh_token');

        if (!$refreshToken) {
            return $response->error('Refresh token não fornecido', 400)->send();
        }

        $payload = Auth::validateRefreshToken($refreshToken);

        if (!$payload) {
            return $response->unauthorized('Refresh token inválido ou expirado')->send();
        }

        $user = User::findById($payload['sub']);

        if (!$user) {
            return $response->unauthorized('Usuário não encontrado')->send();
        }

        $newToken = Auth::generateToken($user['id'], $user['email'], $user['role']);
        $newRefreshToken = Auth::generateRefreshToken($user['id']);

        $response->success([
            'token' => $newToken,
            'refresh_token' => $newRefreshToken,
            'expires_in' => 86400
        ])->send();
    }
}
