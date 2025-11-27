import { useState, useEffect } from 'react';
import { User, Seller, Transaction, Withdrawal } from '../types';
import { api } from '../lib/api';
import { DollarSign, Users, TrendingUp, Clock } from 'lucide-react';

interface AdminStats {
  total_sellers: number;
  active_sellers: number;
  total_transactions: number;
  paid_transactions: number;
  total_volume: number;
  pending_withdrawals: number;
}

interface Props {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: Props) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [sellers, setSellers] = useState<(User & { seller_id: number; balance_available: number; balance_frozen: number; fee_percentage: number })[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sellers' | 'withdrawals'>('dashboard');

  useEffect(() => {
    loadDashboard();
    loadSellers();
    loadWithdrawals();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.get<{ stats: AdminStats; recent_transactions: Transaction[] }>('/admin/dashboard');
      setStats(data.stats);
      setRecentTransactions(data.recent_transactions);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const loadSellers = async () => {
    try {
      const data = await api.get<any[]>('/admin/sellers');
      setSellers(data);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const data = await api.get<Withdrawal[]>('/admin/withdrawals');
      setWithdrawals(data);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleWithdrawalAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/admin/withdrawals/${id}/${action}`, {});
      loadWithdrawals();
      loadDashboard();
      alert(`Saque ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso`);
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
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-4 py-2 rounded ${activeTab === 'sellers' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Sellers
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded ${activeTab === 'withdrawals' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Saques ({withdrawals.filter(w => w.status === 'pending').length})
          </button>
        </div>

        {activeTab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-blue-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Sellers</h3>
                </div>
                <p className="text-3xl font-bold">{stats.active_sellers}/{stats.total_sellers}</p>
                <p className="text-sm text-gray-500">ativos/total</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-green-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Transações</h3>
                </div>
                <p className="text-3xl font-bold">{stats.paid_transactions}/{stats.total_transactions}</p>
                <p className="text-sm text-gray-500">pagas/total</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-purple-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Volume</h3>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(parseFloat(stats.total_volume.toString()))}</p>
                <p className="text-sm text-gray-500">total processado</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="text-orange-600" size={24} />
                  <h3 className="font-semibold text-gray-700">Saques</h3>
                </div>
                <p className="text-3xl font-bold">{stats.pending_withdrawals}</p>
                <p className="text-sm text-gray-500">pendentes</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h2 className="text-lg font-bold mb-4">Transações Recentes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">Seller</th>
                        <th className="text-left py-2">Valor</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map(t => (
                        <tr key={t.id} className="border-b">
                          <td className="py-2">#{t.id}</td>
                          <td className="py-2">{t.seller_name}</td>
                          <td className="py-2">{formatCurrency(t.amount)}</td>
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
              </div>
            </div>
          </>
        )}

        {activeTab === 'sellers' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">Gerenciar Sellers</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">ID</th>
                      <th className="text-left py-2">Nome</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Saldo</th>
                      <th className="text-left py-2">Taxa</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map(s => (
                      <tr key={s.id} className="border-b">
                        <td className="py-2">#{s.id}</td>
                        <td className="py-2">{s.name}</td>
                        <td className="py-2">{s.email}</td>
                        <td className="py-2">{formatCurrency(s.balance_available)}</td>
                        <td className="py-2">{s.fee_percentage}%</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            s.status === 'active' ? 'bg-green-100 text-green-800' :
                            s.status === 'suspended' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-4">Gerenciar Saques</h2>
              <div className="space-y-4">
                {withdrawals.filter(w => w.status === 'pending').length === 0 && (
                  <p className="text-gray-500 text-center py-8">Nenhum saque pendente</p>
                )}
                {withdrawals.filter(w => w.status === 'pending').map(w => (
                  <div key={w.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{w.seller_name}</p>
                        <p className="text-sm text-gray-600">{w.seller_email}</p>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(w.amount)}</p>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      <p>PIX: {w.pix_key} ({w.pix_key_type})</p>
                      <p>Taxa: {formatCurrency(w.fee)} | Líquido: {formatCurrency(w.net_amount)}</p>
                      <p>Solicitado em: {formatDate(w.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleWithdrawalAction(w.id, 'approve')}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleWithdrawalAction(w.id, 'reject')}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
