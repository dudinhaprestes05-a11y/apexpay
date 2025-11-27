# Apex Payment Gateway - API Documentation

## Visão Geral

Gateway de pagamento completo com suporte a PIX, gerenciamento de sellers e sistema de saques.

## Autenticação

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "seu@email.com",
  "password": "senha"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "seller": { ... },
    "token": "jwt_token_here"
  }
}
```

### Verificar Sessão
```
GET /api/auth/me
Authorization: Bearer {token}
```

---

## API Pública (Para Integração)

Todas as requisições precisam do header `X-API-Key`.

### Criar Cobrança PIX

```
POST /api/v1/charges
X-API-Key: sua_api_key_aqui
Content-Type: application/json

{
  "amount": 100.00,
  "description": "Pagamento do pedido #123",
  "external_id": "pedido-123",
  "metadata": {
    "customer_id": "123",
    "order_id": "456"
  }
}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "amount": 100.00,
    "status": "pending",
    "pix_code": "00020126580014br.gov.bcb.pix...",
    "pix_qrcode": "data:image/png;base64,...",
    "expires_at": "2024-01-01 15:00:00",
    "created_at": "2024-01-01 14:00:00"
  }
}
```

### Consultar Status

```
GET /api/v1/charges/{id}
X-API-Key: sua_api_key_aqui

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "amount": 100.00,
    "status": "paid",
    "paid_at": "2024-01-01 14:05:00",
    ...
  }
}
```

### Confirmar Pagamento (Simulação)

```
POST /api/v1/charges/{id}/confirm
X-API-Key: sua_api_key_aqui
Content-Type: application/json

{
  "payer_name": "João Silva",
  "payer_document": "12345678900"
}

Response:
{
  "success": true,
  "message": "Payment confirmed"
}
```

---

## Endpoints do Seller

Requer autenticação via Bearer token.

### Dashboard

```
GET /api/seller/dashboard
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "balance_available": 1500.00,
    "balance_frozen": 200.00,
    "total_transactions": 50,
    "paid_transactions": 45,
    "total_volume": 5000.00,
    "pending_withdrawals": 1
  }
}
```

### Listar Transações

```
GET /api/seller/transactions?page=1
Authorization: Bearer {token}
```

### Solicitar Saque

```
POST /api/seller/withdrawals/request
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 500.00,
  "pix_key": "12345678900",
  "pix_key_type": "cpf"
}
```

### Listar Saques

```
GET /api/seller/withdrawals
Authorization: Bearer {token}
```

### Obter API Keys

```
GET /api/seller/api-keys
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "api_key": "...",
    "api_secret": "..."
  }
}
```

### Regenerar API Keys

```
POST /api/seller/api-keys/regenerate
Authorization: Bearer {token}
```

### Atualizar Configurações

```
PUT /api/seller/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "webhook_url": "https://seu-site.com/webhook",
  "pix_key": "seu@email.com",
  "pix_key_type": "email"
}
```

---

## Endpoints do Admin

Requer autenticação de admin via Bearer token.

### Dashboard

```
GET /api/admin/dashboard
Authorization: Bearer {token}
```

### Listar Sellers

```
GET /api/admin/sellers
Authorization: Bearer {token}
```

### Criar Seller

```
POST /api/admin/sellers/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "seller@email.com",
  "name": "Nome do Seller",
  "password": "senha123",
  "fee_percentage": 2.5
}

Response:
{
  "success": true,
  "data": {
    "user_id": 2,
    "api_key": "...",
    "api_secret": "..."
  }
}
```

### Alterar Status do Seller

```
PUT /api/admin/sellers/{user_id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "active" | "suspended" | "pending"
}
```

### Listar Saques

```
GET /api/admin/withdrawals
Authorization: Bearer {token}
```

### Aprovar Saque

```
POST /api/admin/withdrawals/{id}/approve
Authorization: Bearer {token}
```

### Rejeitar Saque

```
POST /api/admin/withdrawals/{id}/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Motivo da rejeição"
}
```

---

## Webhooks

Quando uma transação é confirmada, o sistema envia uma notificação para a URL configurada pelo seller.

```
POST {webhook_url}
Content-Type: application/json

{
  "event": "charge.paid",
  "data": {
    "id": 1,
    "external_id": "pedido-123",
    "amount": 100.00,
    "status": "paid",
    "paid_at": "2024-01-01 14:05:00"
  }
}
```

---

## Status de Transação

- `pending`: Aguardando pagamento
- `paid`: Pago
- `expired`: Expirado
- `cancelled`: Cancelado
- `refunded`: Reembolsado

## Status de Saque

- `pending`: Aguardando aprovação
- `approved`: Aprovado pelo admin
- `rejected`: Rejeitado
- `completed`: Concluído
- `failed`: Falhou

---

## Exemplo de Integração (PHP)

```php
<?php

$apiKey = 'sua_api_key_aqui';
$apiUrl = 'https://seu-dominio.com/api/v1/charges';

$data = [
    'amount' => 100.00,
    'description' => 'Pagamento teste',
    'external_id' => 'pedido-' . time()
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-API-Key: ' . $apiKey
]);

$response = curl_exec($ch);
$result = json_decode($response, true);

if ($result['success']) {
    echo "QR Code PIX: " . $result['data']['pix_code'];
}
?>
```

---

## Banco de Dados

Execute o arquivo `database.sql` para criar as tabelas:

```bash
mysql -u apex -p apex < database.sql
```

**Usuário Admin Padrão:**
- Email: `admin@admin.com`
- Senha: `admin123`

---

## Variáveis de Ambiente (.env)

```
DB_HOST=localhost
DB_NAME=apex
DB_USER=apex
DB_PASS=sua_senha
JWT_SECRET=sua_chave_secreta_aqui
DEFAULT_PIX_KEY=sua_chave_pix_padrao
```
