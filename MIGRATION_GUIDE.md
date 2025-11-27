# Guia de Migração: Supabase → PHP/MySQL

Este guia detalha como migrar o frontend React do Supabase para a nova API PHP.

## Visão Geral

A migração envolve:
1. Remover dependência do Supabase
2. Criar novo cliente de API
3. Atualizar Context de autenticação
4. Atualizar todas as chamadas de API
5. Ajustar rotas e guards

## Passo 1: Remover Supabase

### 1.1 Desinstalar Pacote

```bash
npm uninstall @supabase/supabase-js
```

### 1.2 Remover Arquivo Supabase

```bash
rm src/lib/supabase.ts
```

## Passo 2: Criar API Client

Crie o arquivo `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.seudominio.com/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(endpoint: string, body?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.post('/auth/login', { email, password });
    this.setToken(response.data.token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    return response;
  }

  async register(data: { email: string; password: string; name: string; document_cpf_cnpj: string }) {
    const response = await this.post('/auth/register', data);
    this.setToken(response.data.token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    return response;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await this.post('/auth/refresh', { refresh_token: refreshToken });
    this.setToken(response.data.token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    return response;
  }

  async logout() {
    this.clearToken();
  }
}

export const api = new ApiClient();
```

## Passo 3: Atualizar AuthContext

Edite `src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'seller';
  kyc_status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/seller/profile');
      setUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response.data.user);
  };

  const register = async (data: any) => {
    const response = await api.register(data);
    setUser(response.data.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Passo 4: Atualizar Páginas

### 4.1 Login Page

Antes (Supabase):
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

Depois (PHP API):
```typescript
await login(email, password);
```

### 4.2 Dashboard Page

Antes (Supabase):
```typescript
const { data: wallet } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

Depois (PHP API):
```typescript
const response = await api.get('/seller/wallet');
const wallet = response.data;
```

### 4.3 Transactions Page

Antes (Supabase):
```typescript
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(50);
```

Depois (PHP API):
```typescript
const response = await api.get('/seller/transactions?limit=50');
const transactions = response.data.transactions;
```

### 4.4 Deposits Page

Antes (Supabase):
```typescript
const { data, error } = await supabase.functions.invoke('create-deposit', {
  body: { user_id: user.id, amount, description }
});
```

Depois (PHP API):
```typescript
const response = await api.post('/seller/deposits', { amount, description });
const deposit = response.data;
```

## Passo 5: Atualizar Variáveis de Ambiente

Edite `.env`:

```env
# Remover:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# Adicionar:
VITE_API_URL=https://api.seudominio.com/api
```

## Passo 6: Mapeamento Completo de Endpoints

### Autenticação
- `supabase.auth.signInWithPassword()` → `api.login(email, password)`
- `supabase.auth.signUp()` → `api.register(data)`
- `supabase.auth.signOut()` → `api.logout()`

### Wallet
- `supabase.from('wallets').select()` → `api.get('/seller/wallet')`

### Transactions
- `supabase.from('transactions').select()` → `api.get('/seller/transactions')`
- `supabase.from('transactions').insert()` → `api.post('/seller/transactions/cashin', data)`

### Deposits
- `supabase.functions.invoke('create-deposit')` → `api.post('/seller/deposits', data)`
- `supabase.from('deposits').select()` → `api.get('/seller/deposits')`

### Admin
- `supabase.from('users').select()` (sellers) → `api.get('/admin/sellers')`
- `supabase.from('users').update()` → `api.put('/admin/sellers/{id}', data)`
- `supabase.from('payment_acquirers').select()` → `api.get('/admin/acquirers')`

## Passo 7: Tratamento de Erros

O formato de resposta da API PHP é padronizado:

**Sucesso:**
```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": {...}
}
```

**Erro:**
```json
{
  "success": false,
  "message": "Mensagem de erro",
  "errors": {...}
}
```

Exemplo de tratamento:

```typescript
try {
  const response = await api.post('/seller/deposits', { amount: 100 });
  console.log('Sucesso:', response.data);
} catch (error) {
  console.error('Erro:', error.message);
  // Exibir mensagem de erro ao usuário
}
```

## Passo 8: Upload de Arquivos

Para upload de documentos KYC:

```typescript
async function uploadDocument(file: File, documentType: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/seller/kyc/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
}
```

## Passo 9: Real-time Updates

Supabase oferece real-time subscriptions. Na API PHP, você tem duas opções:

### Opção 1: Polling

```typescript
// Atualizar a cada 30 segundos
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await api.get('/seller/wallet');
    setWallet(response.data);
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

### Opção 2: WebSockets (futuro)

Pode ser implementado posteriormente usando bibliotecas como Socket.IO.

## Passo 10: Build e Deploy

### Build do Frontend

```bash
npm run build
```

### Deploy no Plesk

1. Faça upload da pasta `dist/` para `/httpdocs/` no Plesk
2. Configure o document root para `/httpdocs` (frontend)
3. A API já deve estar em `/httpdocs/api/public`

### Estrutura Final no Plesk

```
/httpdocs/
├── index.html         # Frontend React
├── assets/
├── api/               # Backend PHP
│   └── public/
│       └── index.php
```

## Checklist de Migração

- [ ] Remover @supabase/supabase-js
- [ ] Criar src/lib/api.ts
- [ ] Atualizar AuthContext.tsx
- [ ] Atualizar todas as páginas
- [ ] Atualizar variáveis de ambiente
- [ ] Testar login
- [ ] Testar todas funcionalidades
- [ ] Build do frontend
- [ ] Deploy no servidor
- [ ] Testes end-to-end

## Troubleshooting

### CORS Error

Verifique o `.env` do backend:
```env
CORS_ALLOWED_ORIGINS=https://seudominio.com
```

### Token Expirado

O token expira em 24h. Implemente refresh automático:

```typescript
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        await api.refreshToken();
        // Retry request
        return api.request(error.config);
      } catch {
        api.logout();
        window.location.href = '/login';
      }
    }
    throw error;
  }
);
```

### Formato de Data

A API retorna timestamps MySQL. Converta conforme necessário:

```typescript
const date = new Date(transaction.created_at);
const formatted = date.toLocaleDateString('pt-BR');
```

## Recursos Adicionais

- Documentação da API: `/backend/README.md`
- Schema do banco: `/backend/database/schema.sql`
- Postman Collection: (criar futuramente)

## Suporte

Para dúvidas sobre a migração, consulte a documentação ou abra um issue.
