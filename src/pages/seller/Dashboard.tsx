import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Transaction, Wallet, SellerFees } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/format';
import { StatusBadge } from '../../components/StatusBadge';
import { Wallet as WalletIcon, TrendingUp, CreditCard, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { useRouter } from '../../components/Router';

export function SellerDashboard() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fees, setFees] = useState<SellerFees | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    try {
      const [walletResult, transactionsResult, feesResult] = await Promise.all([
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle(),
        supabase
          .from('seller_transactions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('seller_fees')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle()
      ]);

      if (walletResult.data) setWallet(walletResult.data);
      if (transactionsResult.data) setTransactions(transactionsResult.data);
      if (feesResult.data) setFees(feesResult.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  const totalEarnings = transactions
    .filter(t => t.type === 'cash_in' && t.status === 'paid')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const pendingTransactions = transactions.filter(
    t => t.status === 'pending' || t.status === 'waiting_payment'
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bem-vindo, {user?.name}</p>
      </div>

      {user?.kyc_status === 'pending' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Verificação KYC Pendente</p>
              <p className="text-sm text-yellow-700 mt-1">
                Sua conta está em análise. Você poderá criar transações após a aprovação.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => navigate('/my-documents')}
              >
                Ver Status
              </Button>
            </div>
          </div>
        </Card>
      )}

      {user?.kyc_status === 'rejected' && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Verificação KYC Rejeitada</p>
              <p className="text-sm text-red-700 mt-1">
                {user.rejection_reason || 'Sua conta foi rejeitada. Entre em contato com o suporte.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => navigate('/my-documents')}
              >
                Ver Detalhes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {user?.kyc_status === 'approved' && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Conta Aprovada</p>
              <p className="text-sm text-green-700 mt-1">
                Sua conta está ativa e você pode criar transações.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Saldo Disponível</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(wallet?.balance || 0)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <WalletIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => navigate('/wallet')}
          >
            Ver Carteira
          </Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Recebido</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalEarnings)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transações Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pendingTransactions}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {fees && (
        <Card>
          <CardHeader title="Minhas Taxas" subtitle="Taxas aplicadas nas suas transações" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">Cash-In (Entrada)</h3>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {fees.cash_in_fee_percentage}%
                </span>
              </div>
              {fees.cash_in_fee_fixed > 0 && (
                <p className="text-sm text-gray-600">
                  + Taxa fixa: {formatCurrency(fees.cash_in_fee_fixed)}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Cash-Out (Saída)</h3>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {fees.cash_out_fee_percentage}%
                </span>
              </div>
              {fees.cash_out_fee_fixed > 0 && (
                <p className="text-sm text-gray-600">
                  + Taxa fixa: {formatCurrency(fees.cash_out_fee_fixed)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total pago em taxas:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(wallet?.total_fees_paid || 0)}
              </span>
            </div>
            {fees.min_fee > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Taxa mínima:</span>
                <span className="text-gray-700">{formatCurrency(fees.min_fee)}</span>
              </div>
            )}
            {fees.max_fee && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Taxa máxima:</span>
                <span className="text-gray-700">{formatCurrency(fees.max_fee)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Transações Recentes"
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/transactions')}>
              Ver Todas
            </Button>
          }
        />
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma transação ainda</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {transaction.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.type === 'cash_in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.type === 'cash_in' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(transaction.amount.toString()))}
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

      <Card className="bg-blue-50 border-blue-200">
        <div>
          <h3 className="font-semibold text-blue-900 mb-2">Pronto para começar?</h3>
          <p className="text-sm text-blue-700 mb-4">
            Integre nosso gateway em seu sistema usando nossas APIs
          </p>
          <Button size="sm" onClick={() => navigate('/documentation')}>
            Ver Documentação
          </Button>
        </div>
      </Card>
    </div>
  );
}
