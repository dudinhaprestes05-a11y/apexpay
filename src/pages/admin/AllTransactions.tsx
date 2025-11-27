import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatRelativeTime } from '../../utils/format';
import { Search, Filter, ArrowDownCircle, ArrowUpCircle, Eye, X } from 'lucide-react';

interface TransactionFull {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  admin_fee_amount: number;
  status: string;
  provider_transaction_id: string;
  end_to_end_id: string;
  customer_data: any;
  acquirer_id: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    email: string;
  };
}

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  provider: string;
  provider_transaction_id: string;
  acquirer_id: string;
  paid_at: string;
  created_at: string;
  users?: {
    name: string;
    email: string;
  };
}

interface Seller {
  id: string;
  name: string;
  email: string;
}

export function AllTransactions() {
  const [transactions, setTransactions] = useState<TransactionFull[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredData, setFilteredData] = useState<(TransactionFull | Deposit)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeller, setFilterSeller] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<TransactionFull | Deposit | null>(null);
  const [viewMode, setViewMode] = useState<'transactions' | 'deposits' | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, deposits, searchTerm, filterType, filterStatus, filterSeller, viewMode]);

  async function loadData() {
    try {
      const [transactionsResult, depositsResult, sellersResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, users(name, email)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('deposits')
          .select('*, users(name, email)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'seller')
          .order('name'),
      ]);

      setTransactions(transactionsResult.data || []);
      setDeposits(depositsResult.data || []);
      setSellers(sellersResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let data: (TransactionFull | Deposit)[] = [];

    if (viewMode === 'transactions' || viewMode === 'all') {
      let txs = [...transactions];

      if (filterType !== 'all') {
        txs = txs.filter(t => t.type === filterType);
      }

      if (filterStatus !== 'all') {
        txs = txs.filter(t => t.status === filterStatus);
      }

      if (filterSeller !== 'all') {
        txs = txs.filter(t => t.user_id === filterSeller);
      }

      if (searchTerm) {
        txs = txs.filter(
          t =>
            t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.provider_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      data = [...data, ...txs];
    }

    if (viewMode === 'deposits' || viewMode === 'all') {
      let deps = [...deposits];

      if (filterStatus !== 'all') {
        deps = deps.filter(d => d.status === filterStatus);
      }

      if (filterSeller !== 'all') {
        deps = deps.filter(d => d.user_id === filterSeller);
      }

      if (searchTerm) {
        deps = deps.filter(
          d =>
            d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.provider_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      data = [...data, ...deps];
    }

    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredData(data);
  }

  function isTransaction(item: TransactionFull | Deposit): item is TransactionFull {
    return 'type' in item;
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
        <h1 className="text-2xl font-bold text-gray-900">Todas as Transações</h1>
        <p className="text-gray-600 mt-1">
          Visualize e gerencie todas as transações e depósitos
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por ID, email, nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterSeller !== 'all' || viewMode !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm('');
              setFilterType('all');
              setFilterStatus('all');
              setFilterSeller('all');
              setViewMode('all');
            }}
          >
            <X className="w-4 h-4 mr-1" />
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="flex gap-3 border-b border-gray-200">
        <button
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            viewMode === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Todos ({transactions.length + deposits.length})
        </button>
        <button
          onClick={() => {
            setViewMode('transactions');
            setFilterType('cash_in');
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 relative ${
            viewMode === 'transactions' && filterType === 'cash_in'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Cash In ({transactions.filter(t => t.type === 'cash_in').length})
        </button>
        <button
          onClick={() => {
            setViewMode('transactions');
            setFilterType('cash_out');
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 relative ${
            viewMode === 'transactions' && filterType === 'cash_out'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Cash Out ({transactions.filter(t => t.type === 'cash_out').length})
        </button>
        <button
          onClick={() => {
            setViewMode('deposits');
            setFilterType('all');
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            viewMode === 'deposits'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Depósitos ({deposits.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Seller</label>
          <select
            value={filterSeller}
            onChange={e => setFilterSeller(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="all">Todos os Sellers</option>
            {sellers.map(seller => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="processing">Processando</option>
            <option value="paid">Pago</option>
            <option value="refused">Recusado</option>
            <option value="cancelled">Cancelado</option>
            <option value="expired">Expirado</option>
          </select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {filteredData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum resultado encontrado</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Seller
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Taxa Admin
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 font-mono">
                      {item.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {isTransaction(item) ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.type === 'cash_in'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Depósito
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        <p className="text-gray-900 font-medium">
                          {item.users?.name || 'N/A'}
                        </p>
                        <p className="text-gray-500 text-xs">{item.users?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(item.amount.toString()))}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600">
                      {isTransaction(item) && item.admin_fee_amount
                        ? formatCurrency(parseFloat(item.admin_fee_amount.toString()))
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div>
                        <p>{formatRelativeTime(item.created_at)}</p>
                        {item.paid_at && (
                          <p className="text-xs text-green-600">
                            Pago: {formatRelativeTime(item.paid_at)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Detalhes"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ID</p>
                <p className="text-sm font-mono text-gray-900">{selectedItem.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <StatusBadge status={selectedItem.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="text-sm font-medium text-gray-900">
                  {isTransaction(selectedItem)
                    ? selectedItem.type === 'cash_in'
                      ? 'Cash In'
                      : 'Cash Out'
                    : 'Depósito'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatCurrency(parseFloat(selectedItem.amount.toString()))}
                </p>
              </div>
            </div>

            {isTransaction(selectedItem) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Taxa Total</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(selectedItem.fee_amount?.toString() || '0'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Taxa Admin</p>
                    <p className="text-sm font-medium text-green-600">
                      {formatCurrency(
                        parseFloat(selectedItem.admin_fee_amount?.toString() || '0')
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Valor Líquido</p>
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(parseFloat(selectedItem.net_amount?.toString() || '0'))}
                  </p>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Provider ID</p>
                <p className="text-sm font-mono text-gray-900">
                  {selectedItem.provider_transaction_id || 'N/A'}
                </p>
              </div>
              {isTransaction(selectedItem) && selectedItem.end_to_end_id && (
                <div>
                  <p className="text-sm text-gray-600">End to End ID</p>
                  <p className="text-sm font-mono text-gray-900">
                    {selectedItem.end_to_end_id}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600">Seller</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedItem.users?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">{selectedItem.users?.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Criado em</p>
                <p className="text-sm text-gray-900">
                  {new Date(selectedItem.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              {selectedItem.paid_at && (
                <div>
                  <p className="text-sm text-gray-600">Pago em</p>
                  <p className="text-sm text-green-600">
                    {new Date(selectedItem.paid_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            {isTransaction(selectedItem) && selectedItem.customer_data && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Dados do Cliente</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <pre className="text-xs text-gray-700">
                    {JSON.stringify(selectedItem.customer_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
