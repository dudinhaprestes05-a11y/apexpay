import { Card } from '../../components/ui/Card';
import { Code } from 'lucide-react';

export function Documentation() {
  const curlExample = `curl -X POST https://gateway.example.com/api/transactions \\
  -H "Authorization: Bearer YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100.00,
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "12345678900",
      "documentType": "cpf"
    },
    "metadata": {
      "orderId": "12345"
    }
  }'`;

  const nodeExample = `const axios = require('axios');

const response = await axios.post(
  'https://gateway.example.com/api/transactions',
  {
    amount: 100.00,
    customer: {
      name: 'João Silva',
      email: 'joao@example.com',
      document: '12345678900',
      documentType: 'cpf'
    },
    metadata: {
      orderId: '12345'
    }
  },
  {
    headers: {
      'Authorization': 'Bearer YOUR_CLIENT_ID:YOUR_CLIENT_SECRET',
      'Content-Type': 'application/json'
    }
  }
);

console.log(response.data);`;

  const webhookExample = `{
  "type": "transaction",
  "url": "https://your-webhook.com",
  "objectId": "123456",
  "data": {
    "id": 123456,
    "amount": 750,
    "status": "paid",
    "paymentMethod": "pix",
    "paidAt": "2025-04-29T10:00:00.000Z",
    "metadata": "{ orderId: 123 }",
    "pix": {
      "qrcode": "...",
      "end2EndId": "E123456..."
    }
  }
}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documentação da API</h1>
        <p className="text-gray-600 mt-1">Guia completo de integração</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Autenticação</h2>
        <p className="text-sm text-gray-600 mb-4">
          Todas as requisições devem incluir suas credenciais no header Authorization:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm font-mono">
            Authorization: Bearer CLIENT_ID:CLIENT_SECRET
          </pre>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Criar Transação</h2>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Endpoint:</strong> POST /api/transactions
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Crie uma nova cobrança Pix e receba o QR Code para pagamento.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Exemplo cURL:</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{curlExample}</pre>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Exemplo Node.js:</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono">{nodeExample}</pre>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-2">Resposta de Sucesso:</p>
          <div className="bg-white p-3 rounded border border-blue-100">
            <pre className="text-xs font-mono">
{`{
  "success": true,
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.00,
    "status": "waiting_payment",
    "pix": {
      "qrcode": "00020126580014br.gov.bcb.pix...",
      "copyPaste": "00020126580014br.gov.bcb.pix...",
      "expiresAt": "2025-04-30T10:30:00.000Z"
    }
  }
}`}
            </pre>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Webhooks</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure uma URL de webhook em suas configurações para receber notificações automáticas
          quando o status de uma transação mudar.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Payload do Webhook:</p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono">{webhookExample}</pre>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-900 mb-2">Importante:</p>
            <ul className="text-sm text-yellow-700 space-y-1 ml-4 list-disc">
              <li>Sua URL de webhook deve responder com status 200</li>
              <li>Implemente lógica de retry caso necessário</li>
              <li>Valide sempre a origem do webhook</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status das Transações</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Descrição</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">pending</td>
                <td className="py-2 px-3 text-gray-600">Transação criada, aguardando processamento</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">waiting_payment</td>
                <td className="py-2 px-3 text-gray-600">QR Code gerado, aguardando pagamento</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">paid</td>
                <td className="py-2 px-3 text-gray-600">Pagamento confirmado</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-mono">refused</td>
                <td className="py-2 px-3 text-gray-600">Pagamento recusado</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono">cancelled</td>
                <td className="py-2 px-3 text-gray-600">Transação cancelada</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-gray-50">
        <div className="flex items-start space-x-3">
          <Code className="w-5 h-5 text-blue-600 mt-1" />
          <div>
            <p className="font-medium text-gray-900 mb-2">Precisa de ajuda?</p>
            <p className="text-sm text-gray-600">
              Entre em contato com nosso suporte técnico através do email:
              <a href="mailto:suporte@gateway.com" className="text-blue-600 ml-1">
                suporte@gateway.com
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
