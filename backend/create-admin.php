<?php

/**
 * Create Admin User - Payment Gateway
 *
 * Cria um usuário administrador no sistema
 *
 * Uso:
 *   php create-admin.php email@example.com "Senha123" "Nome Completo"
 */

// Carrega variáveis de ambiente
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;

        list($key, $value) = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
    }
}

$host = getenv('DB_HOST') ?: 'localhost';
$port = getenv('DB_PORT') ?: '3306';
$database = getenv('DB_NAME') ?: 'payment_gateway';
$username = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: '';

echo "=========================================\n";
echo "  Payment Gateway - Create Admin\n";
echo "=========================================\n\n";

// Verificar argumentos
if ($argc < 2) {
    echo "Uso: php create-admin.php <email> [senha] [nome]\n\n";
    echo "Exemplos:\n";
    echo "  php create-admin.php admin@example.com\n";
    echo "  php create-admin.php admin@example.com SenhaSegura123\n";
    echo "  php create-admin.php admin@example.com SenhaSegura123 \"João Silva\"\n\n";
    exit(1);
}

$email = $argv[1];
$userPassword = $argv[2] ?? 'password';
$name = $argv[3] ?? 'Administrador';

// Validar email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "✗ Email inválido: {$email}\n";
    exit(1);
}

try {
    // Conectar ao banco
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Conectando ao banco de dados...\n";
    echo "Database: {$database}\n\n";

    // Verificar se usuário já existe
    $stmt = $pdo->prepare("SELECT id, email FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        echo "⚠️  Usuário já existe!\n";
        echo "ID: {$existing['id']}\n";
        echo "Email: {$existing['email']}\n\n";
        echo "Deseja atualizar este usuário? (s/N): ";

        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        fclose($handle);

        if (trim(strtolower($line)) !== 's') {
            echo "\nOperação cancelada.\n";
            exit(0);
        }

        // Atualizar usuário existente
        $passwordHash = password_hash($userPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        $stmt = $pdo->prepare("
            UPDATE users
            SET password_hash = ?,
                name = ?,
                role = 'admin',
                kyc_status = 'approved',
                is_active = TRUE,
                updated_at = NOW()
            WHERE email = ?
        ");

        $stmt->execute([$passwordHash, $name, $email]);

        echo "\n✓ Usuário atualizado com sucesso!\n\n";
        echo "ID: {$existing['id']}\n";
        echo "Email: {$email}\n";
        echo "Nome: {$name}\n";
        echo "Role: admin\n";
        echo "Senha: {$userPassword}\n\n";

    } else {
        // Criar novo usuário
        $id = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $passwordHash = password_hash($userPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        $stmt = $pdo->prepare("
            INSERT INTO users (id, email, password_hash, name, role, kyc_status, is_active)
            VALUES (?, ?, ?, ?, 'admin', 'approved', TRUE)
        ");

        $stmt->execute([$id, $email, $passwordHash, $name]);

        echo "✓ Usuário admin criado com sucesso!\n\n";
        echo "ID: {$id}\n";
        echo "Email: {$email}\n";
        echo "Nome: {$name}\n";
        echo "Role: admin\n";
        echo "Senha: {$userPassword}\n\n";
    }

    echo "=========================================\n";
    echo "  Você já pode fazer login!\n";
    echo "=========================================\n\n";
    echo "⚠️  IMPORTANTE: Troque a senha após o primeiro login!\n\n";

} catch (PDOException $e) {
    echo "\n✗ Erro: " . $e->getMessage() . "\n";
    exit(1);
}
