# PodPay Gateway - Setup Instructions

## Overview

This is a complete Multi-Acquirer Payment Gateway with PodPay integration, featuring:

- Full KYC (Know Your Customer) system
- Admin dashboard with analytics
- Seller management and wallet system
- Webhook debugging panel
- API key management
- Complete transaction tracking
- Real-time updates with Supabase

## Database Schema

The following tables have been created in Supabase:

- **users** - User accounts (admin/seller) with KYC status
- **wallets** - User balances (available and frozen)
- **transactions** - All payment transactions
- **api_keys** - API credentials for sellers
- **webhook_logs** - Debug logs for all webhooks received
- **podpay_config** - PodPay API configuration

## Creating the First Admin User

Since this is a new system, you need to create the first admin user manually:

### Method 1: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Invite User" or "Add User"
4. Enter email and password
5. After creating the auth user, copy the User ID
6. Go to Table Editor > users table
7. Insert a new row with:
   - `id`: (paste the User ID from auth)
   - `email`: (your email)
   - `name`: (your name)
   - `role`: `admin`
   - `kyc_status`: `approved`

### Method 2: Using SQL Editor

Run this SQL in Supabase SQL Editor (replace with your details):

```sql
-- First, find your auth user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert into users table (replace the UUID with your auth user ID)
INSERT INTO users (id, email, name, role, kyc_status)
VALUES (
  'YOUR-AUTH-USER-ID-HERE',
  'your-email@example.com',
  'Admin Name',
  'admin',
  'approved'
);
```

## Configuring PodPay

After logging in as admin:

1. Navigate to Settings (Configurações)
2. Enter your PodPay credentials:
   - Environment: sandbox or production
   - Public Key
   - Secret Key
   - Webhook URL: `https://[your-supabase-url]/functions/v1/podpay-webhook`

## Webhook URL

The webhook Edge Function has been deployed to:
```
https://eboeahbzmehjopgoptob.supabase.co/functions/v1/podpay-webhook
```

Configure this URL in your PodPay dashboard to receive payment notifications.

## Testing the System

### As Admin:
1. Log in with your admin account
2. View dashboard with system statistics
3. Check "Aprovações KYC" to see pending seller applications
4. Monitor webhooks in "Webhooks" section
5. Configure PodPay credentials in "Configurações"

### As Seller:
1. Create a new seller account (signup)
2. Fill in KYC information (CPF/CNPJ) in "Meus Documentos"
3. Wait for admin approval
4. Once approved:
   - Create API keys in "Minhas Chaves API"
   - View documentation in "Documentação"
   - Check wallet balance in "Minha Carteira"
   - View transactions in "Transações"

## API Integration for Sellers

Sellers can integrate using the Gateway API. Example:

```bash
curl -X POST https://your-gateway-url/api/transactions \
  -H "Authorization: Bearer CLIENT_ID:CLIENT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "12345678900",
      "documentType": "cpf"
    }
  }'
```

## Features Implemented

### Admin Features:
- Dashboard with analytics (volume, transactions, success rate)
- KYC approval system with document review
- Webhook debug panel with JSON viewer
- Seller management
- PodPay configuration

### Seller Features:
- Dashboard with earnings and balance
- KYC document submission
- Wallet management
- API key generation
- Developer documentation
- Transaction history
- Real-time balance updates

### System Features:
- Secure authentication with Supabase Auth
- Row Level Security (RLS) on all tables
- Real-time updates via Supabase subscriptions
- Automatic wallet creation on user signup
- Webhook processing with balance updates
- Transaction status tracking

## Security Notes

- All API keys are hashed before storage
- Client secrets are shown only once at creation
- RLS policies enforce admin/seller access controls
- Webhook Edge Function validates and processes payments
- KYC verification required before API access

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase PostgreSQL
- **Backend**: Supabase Edge Functions
- **Icons**: Lucide React
- **Authentication**: Supabase Auth

## Environment Variables

Already configured in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Next Steps

1. Create your first admin user (see instructions above)
2. Log in and configure PodPay credentials
3. Create test seller accounts
4. Test the KYC approval flow
5. Generate API keys for sellers
6. Test transaction creation and webhook processing

## Support

For issues or questions, check:
- Supabase logs for backend errors
- Browser console for frontend errors
- Webhook logs in admin panel for payment issues
