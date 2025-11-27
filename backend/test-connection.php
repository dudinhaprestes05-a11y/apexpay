<?php

/**
 * Test Database Connection - Payment Gateway
 *
 * Testa a conexão com o banco de dados e valida configurações
 *
 * Uso:
 *   php test-connection.php
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

echo "=========================================\n";
echo "  Payment Gateway - Connection Test\n";
echo "=========================================\n\n";

// Verificar arquivo .env
echo "1. Verificando arquivo .env...\n";
if (!file_exists(__DIR__ . '/.env')) {
    echo "   ✗ Arquivo .env não encontrado!\n";
    echo "   Crie o arquivo copiando .env.example\n\n";
    exit(1);
}
echo "   ✓ Arquivo .env encontrado\n\n";

// Verificar variáveis
echo "2. Verificando variáveis de ambiente...\n";
$requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'JWT_SECRET'];
$missing = [];

foreach ($requiredVars as $var) {
    $value = getenv($var);
    if (empty($value)) {
        $missing[] = $var;
        echo "   ✗ {$var}: não configurado\n";
    } else {
        $display = $var === 'DB_PASS' || $var === 'JWT_SECRET'
            ? str_repeat('*', min(strlen($value), 8))
            : $value;
        echo "   ✓ {$var}: {$display}\n";
    }
}

if (!empty($missing)) {
    echo "\n⚠️  Configure as variáveis faltantes no arquivo .env\n\n";
    exit(1);
}
echo "\n";

// Verificar JWT Secret
echo "3. Validando JWT Secret...\n";
$jwtSecret = getenv('JWT_SECRET');
if (strlen($jwtSecret) < 32) {
    echo "   ⚠️  JWT_SECRET muito curto (mínimo 32 caracteres)\n";
    echo "   Gere um novo com: php -r \"echo bin2hex(random_bytes(32)) . PHP_EOL;\"\n\n";
} else {
    echo "   ✓ JWT Secret configurado corretamente\n\n";
}

// Testar conexão
echo "4. Testando conexão com banco de dados...\n";

$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: '3306';
$database = getenv('DB_NAME');
$username = getenv('DB_USER');
$password = getenv('DB_PASS');

echo "   Host: {$host}:{$port}\n";
echo "   Database: {$database}\n";
echo "   User: {$username}\n\n";

try {
    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "   ✓ Conectado ao servidor MySQL\n";

    // Verificar versão
    $version = $pdo->query("SELECT VERSION()")->fetchColumn();
    echo "   ✓ MySQL Version: {$version}\n";

    // Verificar se banco existe
    $stmt = $pdo->query("SHOW DATABASES LIKE '{$database}'");
    $dbExists = $stmt->fetch();

    if (!$dbExists) {
        echo "   ⚠️  Banco de dados '{$database}' não existe\n";
        echo "   Execute: php migrate.php para criar\n\n";
        exit(0);
    }

    echo "   ✓ Banco de dados '{$database}' encontrado\n\n";

    // Conectar ao banco
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "5. Verificando tabelas...\n";

    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tables)) {
        echo "   ⚠️  Nenhuma tabela encontrada\n";
        echo "   Execute: php migrate.php para criar\n\n";
        exit(0);
    }

    echo "   ✓ Encontradas " . count($tables) . " tabela(s):\n";

    $expectedTables = [
        'users', 'wallets', 'transactions', 'deposits',
        'payment_acquirers', 'seller_acquirer_assignments',
        'seller_configs', 'kyc_documents', 'webhook_logs'
    ];

    foreach ($expectedTables as $table) {
        if (in_array($table, $tables)) {
            $stmt = $pdo->query("SELECT COUNT(*) FROM {$table}");
            $count = $stmt->fetchColumn();
            echo "     ✓ {$table} ({$count} registros)\n";
        } else {
            echo "     ✗ {$table} (não encontrada)\n";
        }
    }

    echo "\n6. Verificando usuários...\n";

    $stmt = $pdo->query("SELECT COUNT(*) as total, role FROM users GROUP BY role");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($users)) {
        echo "   ⚠️  Nenhum usuário cadastrado\n";
        echo "   Execute: php create-admin.php admin@example.com senha123\n\n";
    } else {
        foreach ($users as $user) {
            echo "   ✓ {$user['role']}: {$user['total']} usuário(s)\n";
        }
    }

    echo "\n=========================================\n";
    echo "  ✓ Sistema configurado corretamente!\n";
    echo "=========================================\n\n";

    echo "Próximos passos:\n";
    if (empty($users)) {
        echo "  1. Criar usuário admin: php create-admin.php\n";
    }
    echo "  2. Testar API: curl -X POST http://localhost/api/auth/login\n";
    echo "  3. Ver documentação: cat README.md\n\n";

} catch (PDOException $e) {
    echo "   ✗ Erro de conexão: " . $e->getMessage() . "\n\n";

    echo "Possíveis soluções:\n";
    echo "  • Verifique se MySQL está rodando\n";
    echo "  • Confirme as credenciais no arquivo .env\n";
    echo "  • Verifique permissões do usuário no banco\n";
    echo "  • Teste: mysql -h {$host} -u {$username} -p\n\n";

    exit(1);
}
