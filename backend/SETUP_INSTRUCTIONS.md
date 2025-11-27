# 🚀 Configuração Rápida - Payment Gateway Backend

## Passo 1: Configurar Banco de Dados no Plesk (5 min)

### 1.1 Criar Banco de Dados

1. Acesse o **Plesk** → **Databases** → **Add Database**
2. Preencha:
   - **Database name:** `payment_gateway`
   - **Database user:** Escolha um nome (ex: `gateway_user`)
   - **Password:** Gere uma senha forte
3. Clique em **OK**

### 1.2 Anotar Credenciais

Anote estas informações (você vai precisar):
```
DB_HOST: localhost
DB_NAME: payment_gateway
DB_USER: gateway_user (ou o que você escolheu)
DB_PASS: a senha que você definiu
```

### 1.3 Importar Schema SQL

1. No Plesk, clique em **phpMyAdmin**
2. Selecione o banco `payment_gateway`
3. Clique em **Import**
4. Escolha o arquivo: `backend/database/schema.sql`
5. Clique em **Go**

✅ Pronto! Banco criado com 15+ tabelas.

---

## Passo 2: Configurar .env (2 min)

### 2.1 Editar Credenciais do Banco

Abra o arquivo `backend/.env` e ajuste estas 4 linhas:

```env
DB_HOST=localhost
DB_NAME=payment_gateway
DB_USER=gateway_user
DB_PASS=SuaSenhaMuitoSegura123
```

### 2.2 Gerar JWT Secret

Execute este comando no terminal do Plesk ou via SSH:

```bash
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"
```

Copie o resultado (64 caracteres) e cole no .env:

```env
JWT_SECRET=a1b2c3d4e5f6...seu_hash_gerado_aqui...
```

### 2.3 Configurar URLs

Ajuste estas linhas com seus domínios:

```env
APP_URL=https://api.seudominio.com
CORS_ALLOWED_ORIGINS=https://seudominio.com
```

Se tiver múltiplos domínios frontend:

```env
CORS_ALLOWED_ORIGINS=https://seudominio.com,https://app.seudominio.com,https://painel.seudominio.com
```

✅ Configuração completa!

---

## Passo 3: Upload e Permissões (3 min)

### 3.1 Upload dos Arquivos

Via FTP, SFTP ou File Manager do Plesk:

```
/httpdocs/api/  ← Faça upload de toda a pasta backend/ aqui
```

Estrutura final:

```
/httpdocs/
├── api/
│   ├── .env                 ← Seu arquivo configurado
│   ├── public/
│   │   └── index.php
│   ├── config/
│   ├── core/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   ├── middleware/
│   └── storage/
```

### 3.2 Configurar Permissões

Via SSH ou Terminal do Plesk:

```bash
cd /httpdocs/api
chmod -R 755 .
chmod -R 775 storage/
chmod 600 .env
```

### 3.3 Configurar Document Root no Plesk

1. No Plesk → **Hosting Settings**
2. Altere **Document root** para: `/httpdocs/api/public`
3. Salve

✅ Backend configurado!

---

## Passo 4: Criar Usuário Admin (1 min)

Via phpMyAdmin, execute este SQL:

```sql
INSERT INTO users (id, email, password_hash, name, role, kyc_status)
VALUES (
  UUID(),
  'admin@seudominio.com',
  '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Administrador',
  'admin',
  'approved'
);
```

**Login:**
- Email: `admin@seudominio.com`
- Senha: `password`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

Para alterar a senha:

```bash
# 1. Gerar hash da nova senha
php -r "echo password_hash('MinhaNovaSenh@123', PASSWORD_BCRYPT, ['cost' => 12]) . PHP_EOL;"

# 2. Atualizar no banco via phpMyAdmin:
UPDATE users
SET password_hash = 'hash_gerado_acima'
WHERE email = 'admin@seudominio.com';
```

---

## Passo 5: Testar API (2 min)

### 5.1 Teste Básico

Abra o terminal ou Postman e execute:

```bash
curl -X POST https://api.seudominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seudominio.com","password":"password"}'
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "...",
      "email": "admin@seudominio.com",
      "name": "Administrador",
      "role": "admin"
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "...",
    "expires_in": 86400
  }
}
```

✅ Se recebeu isso, está funcionando!

### 5.2 Teste Dashboard

Usando o token recebido:

```bash
curl https://api.seudominio.com/api/seller/dashboard \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

✅ Backend 100% funcional!

---

## Passo 6: Configurar Adquirente PodPay (3 min)

### 6.1 Obter Credenciais PodPay

1. Acesse [PodPay Dashboard](https://dashboard.podpay.co)
2. Crie uma conta (sandbox para testes)
3. Em **Developers** → **API Keys**, anote:
   - Public Key: `pk_test_...`
   - Secret Key: `sk_test_...`

### 6.2 Criar Adquirente no Banco

Via phpMyAdmin:

```sql
INSERT INTO payment_acquirers (id, name, provider_type, public_key, secret_key, environment, is_active)
VALUES (
  UUID(),
  'PodPay Sandbox',
  'podpay',
  'pk_test_SUA_PUBLIC_KEY_AQUI',
  'sk_test_SUA_SECRET_KEY_AQUI',
  'sandbox',
  TRUE
);
```

Para produção, troque `sandbox` por `production` e use as keys de produção.

### 6.3 Atribuir Adquirente a Sellers

Quando sellers se registrarem, atribua o adquirente:

```sql
-- Primeiro, pegue o ID do seller
SELECT id, name, email FROM users WHERE role = 'seller';

-- Depois, pegue o ID do acquirer
SELECT id, name FROM payment_acquirers;

-- Por fim, atribua
INSERT INTO seller_acquirer_assignments (id, user_id, acquirer_id, priority, weight, is_active)
VALUES (
  UUID(),
  'ID_DO_SELLER',
  'ID_DO_ACQUIRER',
  1,
  100,
  TRUE
);
```

✅ Sistema pronto para processar pagamentos!

---

## Passo 7: Configurar SSL (Já deve estar configurado)

Se ainda não tiver SSL:

1. No Plesk → **SSL/TLS Certificates**
2. Clique em **Install** (Let's Encrypt - gratuito)
3. Marque: **Secure the domain and its www subdomain**
4. Clique em **Install**

Em **Hosting Settings**, marque:
- ✅ Permanent SEO-safe 301 redirect from HTTP to HTTPS

---

## ✅ Checklist Final

- [ ] Banco de dados criado e schema importado
- [ ] .env configurado com credenciais corretas
- [ ] JWT_SECRET gerado e configurado
- [ ] Arquivos uploadados para `/httpdocs/api/`
- [ ] Permissões configuradas (storage/ = 775)
- [ ] Document root = `/httpdocs/api/public`
- [ ] Usuário admin criado
- [ ] Teste de login funcionando
- [ ] SSL configurado e ativo
- [ ] Adquirente PodPay criado
- [ ] CORS configurado com domínio do frontend

---

## 🎉 Pronto!

Seu backend está **100% funcional** e pronto para receber requisições do frontend!

### Próximos Passos:

1. **Migrar Frontend React** → Leia: `MIGRATION_GUIDE.md`
2. **Testar Depósitos** → Criar seller, atribuir adquirente, testar PIX
3. **Configurar Webhooks** → URL: `https://api.seudominio.com/api/webhooks/podpay`
4. **Monitorar Logs** → `storage/logs/app.log`

---

## 🆘 Problemas Comuns

### Erro: "Database connection failed"
- Verifique credenciais no .env
- Teste: `mysql -h localhost -u gateway_user -p payment_gateway`

### Erro 500 Internal Server Error
- Verifique logs: `tail -f storage/logs/app.log`
- Verifique permissões: `chmod -R 775 storage/`

### Erro: "CORS policy blocked"
- Adicione domínio do frontend em `CORS_ALLOWED_ORIGINS`
- Exemplo: `CORS_ALLOWED_ORIGINS=https://meusite.com`

### Erro: "Token invalid"
- Verifique se JWT_SECRET foi configurado
- Token expira em 24h, use refresh token

---

## 📞 Referências Rápidas

- **Comandos SQL:** `backend/COMMANDS.md`
- **Documentação Completa:** `backend/README.md`
- **Migração Frontend:** `MIGRATION_GUIDE.md`
- **Visão Geral:** `DEPLOYMENT_SUMMARY.md`

**Configuração concluída! 🚀**
