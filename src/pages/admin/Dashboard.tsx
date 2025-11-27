import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card, CardHeader } from '../../components/ui/Card';
import { Transaction } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';
import { TrendingUp, Users, CreditCard, AlertCircle, DollarSign, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Link } from '../../components/Router';

interface DashboardStats {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  activeUsers: number;
  pendingKYC: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalVolume: 0,
    successRate: 0,
    activeUsers: 0,
    pendingKYC: 0,
  });
  const [cashInStats, setCashInStats] = useState({ count: 0, volume: 0 });
  const [cashOutStats, setCashOutStats] = useState({ count: 0, volume: 0 });
  const [depositStats, setDepositStats] = useState({ count: 0, volume: 0, pending: 0 });
  const [adminFees, setAdminFees] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setError(null);
      const dashboardData = await adminService.getDashboard();

      setStats({
        totalTransactions: dashboardData.total_transactions,
        totalVolume: dashboardData.total_volume,
        successRate: (dashboardData.total_transactions > 0
          ? ((dashboardData.total_transactions - dashboardData.pending_kyc) / dashboardData.total_transactions) * 100
          : 0),
        activeUsers: dashboardData.active_sellers,
        pendingKYC: dashboardData.pending_kyc,
      });

      const transactions = await adminService.listTransactions();
      setRecentTransactions(transactions.slice(0, 10));

      const paidTransactions = transactions.filter(t => t.status === 'paid');
      const cashInTxs = paidTransactions.filter(t => t.type === 'cash_in');
      const cashOutTxs = paidTransactions.filter(t => t.type === 'cash_out');

      setCashInStats({
        count: cashInTxs.length,
        volume: cashInTxs.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      });

      setCashOutStats({
        count: cashOutTxs.length,
        volume: cashOutTxs.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
      });

      const totalAdminFees = paidTransactions.reduce(
        (sum, t) => sum + parseFloat((t.admin_fee_amount || 0).toString()),
        0
      );
      setAdminFees(totalAdminFees);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      setError(error.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Erro ao carregar dashboard</p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <p className="text-gray-600 mt-1">Visão geral do gateway de pagamentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receita (Taxas)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(adminFees)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Volume Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalVolume)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalTransactions} transações</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.successRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sellers Ativos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.activeUsers}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Depósitos Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {depositStats.pending}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-full">
              <ArrowDownCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Cash In (Entrada)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(cashInStats.volume)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{cashInStats.count} transações</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-full">
              <ArrowUpCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Cash Out (Saída)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(cashOutStats.volume)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{cashOutStats.count} transações</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Depósitos Pagos</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(depositStats.volume)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{depositStats.count} depósitos</p>
            </div>
          </div>
        </Card>
      </div>

      {stats.pendingKYC > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">
                {stats.pendingKYC} {stats.pendingKYC === 1 ? 'solicitação' : 'solicitações'} de KYC pendente
              </p>
              <p className="text-sm text-yellow-700">
                Acesse a página de Aprovações KYC para revisar
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardHeader title="Transações Recentes" />
          <Link to="/admin/transactions" className="text-sm text-blue-600 hover:text-blue-800">
            Ver todas →
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma transação ainda</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Taxa Admin</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 font-mono">
                      {transaction.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === 'cash_in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(transaction.amount.toString()))}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600">
                      {transaction.admin_fee_amount
                        ? formatCurrency(parseFloat(transaction.admin_fee_amount.toString()))
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatRelativeTime(transaction.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
