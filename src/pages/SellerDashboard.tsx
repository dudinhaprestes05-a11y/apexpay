import { useState, useEffect } from 'react';
import { User, Seller, Transaction, Withdrawal } from '../types';
import { api } from '../lib/api';
import { DollarSign, TrendingUp, Clock, Key, Settings } from 'lucide-react';

interface SellerStats {
  balance_available: number;
  balance_frozen: number;
  total_transactions: number;
  paid_transactions: number;
  total_volume: number;
  pending_withdrawals: number;
}

interface Props {
  user: User;
  seller: Seller;
  onLogout: () => void;
}

export function SellerDashboard({ user, seller: initialSeller, onLogout }: Props) {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'withdrawals' | 'api'>('dashboard');
  const [seller, setSeller] = useState(initialSeller);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cpf');

  useEffect(() => {
    loadDashboard();
    loadTransactions();
    loadWithdrawals();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.get<SellerStats>('/seller/dashboard');
      setStats(data);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await api.get<{ transactions: Transaction[] }>('/seller/transactions');
      setTransactions(data.transactions);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const data = await api.get<Withdrawal[]>('/seller/withdrawals');
      setWithdrawals(data);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!withdrawAmount || !pixKey || !pixKeyType) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      await api.post('/seller/withdrawals/request', {
        amount: parseFloat(withdrawAmount),
        pix_key: pixKey,
        pix_key_type: pixKeyType
      });
      alert('Saque solicitado com sucesso!');
      setWithdrawAmount('');
      setPixKey('');
      loadDashboard();
      loadWithdrawals();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Seller Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Transações
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Saques
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 rounded whitespace-nowrap ${activeTab === 'api' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            API
          </button>
        </div>

        {activeTab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-green-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Saldo Disponível</h3>
                </div>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.balance_available)}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="text-orange-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Saldo Congelado</h3>
                </div>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(stats.balance_frozen)}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-blue-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Transações</h3>
                </div>
                <p className="text-3xl font-bold">{stats.paid_transactions}/{stats.total_transactions}</p>
                <p className="text-sm text-gray-500">pagas/total</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">Solicitar Saque</h2>
              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-2 border rounded"
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Disponível: {formatCurrency(stats.balance_available)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Chave PIX</label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value as any)}
                      className="w-full px-4 py-2 border rounded"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Chave PIX</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                    placeholder="Digite sua chave PIX"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Solicitar Saque
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">Histórico de Transações</h2>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma transação encontrada</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">Valor</th>
                        <th className="text-left py-2">Taxa</th>
                        <th className="text-left py-2">Líquido</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} className="border-b">
                          <td className="py-2">#{t.id}</td>
                          <td className="py-2">{formatCurrency(t.amount)}</td>
                          <td className="py-2">{formatCurrency(t.fee)}</td>
                          <td className="py-2">{formatCurrency(t.net_amount)}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              t.status === 'paid' ? 'bg-green-100 text-green-800' :
                              t.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2 text-sm">{formatDate(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">Histórico de Saques</h2>
              {withdrawals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum saque encontrado</p>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map(w => (
                    <div key={w.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">Saque #{w.id}</p>
                          <p className="text-sm text-gray-600">PIX: {w.pix_key}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatCurrency(w.amount)}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                            w.status === 'approved' || w.status === 'completed' ? 'bg-green-100 text-green-800' :
                            w.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {w.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Taxa: {formatCurrency(w.fee)} | Líquido: {formatCurrency(w.net_amount)}</p>
                        <p>Solicitado em: {formatDate(w.created_at)}</p>
                        {w.notes && <p className="text-red-600 mt-1">Observação: {w.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">Credenciais da API</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">API Key</label>
                  <input
                    type="text"
                    value={seller.api_key}
                    readOnly
                    className="w-full px-4 py-2 border rounded bg-gray-50 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API Secret</label>
                  <input
                    type="text"
                    value={seller.api_secret}
                    readOnly
                    className="w-full px-4 py-2 border rounded bg-gray-50 font-mono text-sm"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h3 className="font-semibold mb-2">Exemplo de Uso</h3>
                  <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`curl -X POST https://seu-dominio.com/api/v1/charges \\
  -H "X-API-Key: ${seller.api_key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100.00,
    "description": "Pagamento teste",
    "external_id": "pedido-123"
  }'`}
                  </pre>
                </div>

                <p className="text-sm text-gray-600">
                  Taxa da sua conta: <strong>{seller.fee_percentage}%</strong> por transação
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
