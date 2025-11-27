<?php

/**
 * Migration Runner - Payment Gateway
 *
 * Executa automaticamente o schema SQL no banco de dados
 *
 * Uso:
 *   php migrate.php
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
echo "  Payment Gateway - Migration Runner\n";
echo "=========================================\n\n";

echo "Conectando ao banco de dados...\n";
echo "Host: {$host}\n";
echo "Database: {$database}\n";
echo "User: {$username}\n\n";

try {
    // Conectar ao MySQL
    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "✓ Conectado com sucesso!\n\n";

    // Verificar se banco existe
    $stmt = $pdo->query("SHOW DATABASES LIKE '{$database}'");
    $dbExists = $stmt->fetch();

    if (!$dbExists) {
        echo "Criando banco de dados '{$database}'...\n";
        $pdo->exec("CREATE DATABASE {$database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "✓ Banco de dados criado!\n\n";
    } else {
        echo "✓ Banco de dados já existe.\n\n";
    }

    // Conectar ao banco específico
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verificar se já tem dados
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($tables) > 0) {
        echo "⚠️  ATENÇÃO: O banco já possui " . count($tables) . " tabela(s).\n";
        echo "Deseja continuar e recriar as tabelas? (s/N): ";

        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        fclose($handle);

        if (trim(strtolower($line)) !== 's') {
            echo "\nMigration cancelada.\n";
            exit(0);
        }

        echo "\nDropando tabelas existentes...\n";
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
        foreach ($tables as $table) {
            $pdo->exec("DROP TABLE IF EXISTS {$table}");
            echo "  - Dropped: {$table}\n";
        }
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
        echo "✓ Tabelas removidas.\n\n";
    }

    // Executar schema SQL
    $schemaFile = __DIR__ . '/database/schema.sql';

    if (!file_exists($schemaFile)) {
        throw new Exception("Arquivo schema.sql não encontrado em: {$schemaFile}");
    }

    echo "Executando schema SQL...\n";
    $sql = file_get_contents($schemaFile);

    // Remover comentários
    $sql = preg_replace('/--.*$/m', '', $sql);
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);

    // Dividir em statements
    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        function($stmt) {
            return !empty($stmt);
        }
    );

    $executed = 0;
    $failed = 0;

    foreach ($statements as $statement) {
        try {
            $pdo->exec($statement);
            $executed++;

            // Detectar tipo de statement
            if (preg_match('/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i', $statement, $matches)) {
                echo "  ✓ Tabela criada: {$matches[1]}\n";
            } elseif (preg_match('/CREATE\s+TRIGGER\s+`?(\w+)`?/i', $statement, $matches)) {
                echo "  ✓ Trigger criado: {$matches[1]}\n";
            } elseif (preg_match('/CREATE\s+INDEX/i', $statement)) {
                echo "  ✓ Index criado\n";
            } elseif (preg_match('/INSERT\s+INTO/i', $statement)) {
                echo "  ✓ Dados inseridos\n";
            }

        } catch (PDOException $e) {
            $failed++;
            echo "  ✗ Erro: " . $e->getMessage() . "\n";
        }
    }

    echo "\n=========================================\n";
    echo "  Migration concluída!\n";
    echo "=========================================\n\n";
    echo "Statements executados: {$executed}\n";
    echo "Statements com erro: {$failed}\n\n";

    // Verificar tabelas criadas
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo "Tabelas criadas: " . count($tables) . "\n";
    foreach ($tables as $table) {
        echo "  - {$table}\n";
    }

    echo "\n✓ Sistema pronto para uso!\n\n";

} catch (PDOException $e) {
    echo "\n✗ Erro de conexão: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "\n✗ Erro: " . $e->getMessage() . "\n";
    exit(1);
}
