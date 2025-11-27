import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Transaction } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';
import { CreditCard, ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'cash_in' | 'cash_out'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [transactions, typeFilter, searchTerm]);

  function applyFilter() {
    let filtered = transactions;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(lowerSearch) ||
        t.provider_transaction_id?.toLowerCase().includes(lowerSearch) ||
        t.end_to_end_id?.toLowerCase().includes(lowerSearch) ||
        t.customer_data?.name?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredTransactions(filtered);
  }

  async function loadTransactions() {
    try {
      const tableName = user?.role === 'seller' ? 'seller_transactions' : 'transactions';

      let query = supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.role === 'seller') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <p className="text-gray-600 mt-1">
          {user?.role === 'admin' ? 'Todas as transações do sistema' : 'Histórico de transações'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por ID da transação, ID do provedor, End-to-End ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 border-b border-gray-200">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            typeFilter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Todas ({transactions.length})
        </button>
        <button
          onClick={() => setTypeFilter('cash_in')}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 relative ${
            typeFilter === 'cash_in'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Cash In ({transactions.filter(t => t.type === 'cash_in').length})
        </button>
        <button
          onClick={() => setTypeFilter('cash_out')}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 relative ${
            typeFilter === 'cash_out'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Cash Out ({transactions.filter(t => t.type === 'cash_out').length})
        </button>
      </div>

      <Card>
        <CardHeader title={`${filteredTransactions.length} transações`} />
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Taxa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Valor Líquido</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Método</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data</th>
                  {user?.role === 'admin' && (
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Provider ID</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-900">
                      {transaction.id.slice(0, 8)}
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
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transaction.fee_amount > 0 ? (
                        <span title={`${transaction.fee_percentage || 0}%`}>
                          {formatCurrency(parseFloat(transaction.fee_amount.toString()))}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-700">
                      {transaction.net_amount > 0 ? (
                        formatCurrency(parseFloat(transaction.net_amount.toString()))
                      ) : (
                        formatCurrency(parseFloat(transaction.amount.toString()))
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={transaction.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transaction.payment_method?.toUpperCase() || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatRelativeTime(transaction.created_at)}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="py-3 px-4 text-sm font-mono text-gray-600">
                        {transaction.provider_transaction_id || '-'}
                      </td>
                    )}
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
