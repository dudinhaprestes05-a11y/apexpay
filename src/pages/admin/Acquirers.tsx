import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { PaymentAcquirer, Environment } from '../../types';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit, Trash2, Check, X, Settings } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface TransactionLimit {
  id?: string;
  acquirer_id: string;
  transaction_type: 'cash_in' | 'cash_out';
  min_amount: number;
  max_amount: number | null;
  daily_limit: number | null;
  monthly_limit: number | null;
  is_active: boolean;
}

export function Acquirers() {
  const [acquirers, setAcquirers] = useState<PaymentAcquirer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [editingAcquirer, setEditingAcquirer] = useState<PaymentAcquirer | null>(null);
  const [selectedAcquirer, setSelectedAcquirer] = useState<PaymentAcquirer | null>(null);
  const [limits, setLimits] = useState<TransactionLimit[]>([]);

  const [form, setForm] = useState<Partial<PaymentAcquirer>>({
    name: '',
    provider_type: 'podpay',
    public_key: '',
    secret_key: '',
    environment: 'sandbox',
    is_active: true,
    webhook_url: '',
  });

  useEffect(() => {
    loadAcquirers();
  }, []);

  async function loadAcquirers() {
    try {
      const { data, error } = await supabase
        .from('payment_acquirers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAcquirers(data || []);
    } catch (error) {
      console.error('Error loading acquirers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLimits(acquirerId: string) {
    try {
      const { data, error } = await supabase
        .from('acquirer_transaction_limits')
        .select('*')
        .eq('acquirer_id', acquirerId);

      if (error) throw error;

      const existingLimits = data || [];
      const transactionTypes: Array<'cash_in' | 'cash_out'> = [
        'cash_in',
        'cash_out',
      ];

      const allLimits = transactionTypes.map((type) => {
        const existing = existingLimits.find((l) => l.transaction_type === type);
        return (
          existing || {
            acquirer_id: acquirerId,
            transaction_type: type,
            min_amount: 1.0,
            max_amount: null,
            daily_limit: null,
            monthly_limit: null,
            is_active: true,
          }
        );
      });

      setLimits(allLimits);
    } catch (error) {
      console.error('Error loading limits:', error);
    }
  }

  async function handleSave() {
    try {
      if (editingAcquirer) {
        const { error } = await supabase
          .from('payment_acquirers')
          .update(form)
          .eq('id', editingAcquirer.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_acquirers').insert([form]);

        if (error) throw error;
      }

      setModalOpen(false);
      resetForm();
      loadAcquirers();
    } catch (error) {
      console.error('Error saving acquirer:', error);
      alert('Erro ao salvar adquirente');
    }
  }

  async function handleSaveLimits() {
    if (!selectedAcquirer) return;

    try {
      for (const limit of limits) {
        if (limit.id) {
          const { error } = await supabase
            .from('acquirer_transaction_limits')
            .update({
              min_amount: limit.min_amount,
              max_amount: limit.max_amount,
              daily_limit: limit.daily_limit,
              monthly_limit: limit.monthly_limit,
              is_active: limit.is_active,
            })
            .eq('id', limit.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('acquirer_transaction_limits')
            .insert({
              acquirer_id: limit.acquirer_id,
              transaction_type: limit.transaction_type,
              min_amount: limit.min_amount,
              max_amount: limit.max_amount,
              daily_limit: limit.daily_limit,
              monthly_limit: limit.monthly_limit,
              is_active: limit.is_active,
            });

          if (error) throw error;
        }
      }

      setLimitsModalOpen(false);
      alert('Limites salvos com sucesso!');
    } catch (error) {
      console.error('Error saving limits:', error);
      alert('Erro ao salvar limites');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta adquirente?')) return;

    try {
      const { error } = await supabase.from('payment_acquirers').delete().eq('id', id);

      if (error) throw error;
      loadAcquirers();
    } catch (error) {
      console.error('Error deleting acquirer:', error);
      alert('Erro ao excluir adquirente. Pode haver sellers atribuídos.');
    }
  }

  async function handleToggleActive(acquirer: PaymentAcquirer) {
    try {
      const { error } = await supabase
        .from('payment_acquirers')
        .update({ is_active: !acquirer.is_active })
        .eq('id', acquirer.id);

      if (error) throw error;
      loadAcquirers();
    } catch (error) {
      console.error('Error toggling acquirer:', error);
    }
  }

  function openCreateModal() {
    setEditingAcquirer(null);
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(acquirer: PaymentAcquirer) {
    setEditingAcquirer(acquirer);
    setForm({
      name: acquirer.name,
      provider_type: acquirer.provider_type,
      public_key: acquirer.public_key,
      secret_key: acquirer.secret_key,
      environment: acquirer.environment,
      is_active: acquirer.is_active,
      webhook_url: acquirer.webhook_url || '',
    });
    setModalOpen(true);
  }

  function openLimitsModal(acquirer: PaymentAcquirer) {
    setSelectedAcquirer(acquirer);
    loadLimits(acquirer.id);
    setLimitsModalOpen(true);
  }

  function updateLimit(index: number, field: keyof TransactionLimit, value: any) {
    const newLimits = [...limits];
    newLimits[index] = { ...newLimits[index], [field]: value };
    setLimits(newLimits);
  }

  function resetForm() {
    setForm({
      name: '',
      provider_type: 'podpay',
      public_key: '',
      secret_key: '',
      environment: 'sandbox',
      is_active: true,
      webhook_url: '',
    });
  }

  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'cash_in':
        return 'Entrada (Cash In + Depósitos)';
      case 'cash_out':
        return 'Saída (Cash Out)';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adquirentes</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as adquirentes e configure limites por tipo de transação
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Adquirente
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Adquirentes Cadastradas"
          subtitle={`${acquirers.length} adquirentes no sistema`}
        />

        <div className="overflow-x-auto">
          {acquirers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma adquirente cadastrada</p>
              <Button className="mt-4" onClick={openCreateModal}>
                Cadastrar Primeira Adquirente
              </Button>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ambiente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Public Key
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {acquirers.map((acquirer) => (
                  <tr key={acquirer.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{acquirer.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{acquirer.provider_type.toUpperCase()}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={acquirer.environment === 'production' ? 'success' : 'warning'}
                      >
                        {acquirer.environment === 'production' ? 'Produção' : 'Sandbox'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(acquirer)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                          acquirer.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {acquirer.is_active ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Ativa</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            <span>Inativa</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs text-gray-600">
                        {acquirer.public_key.substring(0, 20)}...
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openLimitsModal(acquirer)}
                          title="Configurar Limites"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(acquirer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(acquirer.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAcquirer ? 'Editar Adquirente' : 'Nova Adquirente'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Adquirente Principal"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Provedor
            </label>
            <select
              value={form.provider_type}
              onChange={(e) => setForm({ ...form, provider_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="podpay">PodPay</option>
            </select>
          </div>

          <Input
            label="Public Key"
            value={form.public_key || ''}
            onChange={(e) => setForm({ ...form, public_key: e.target.value })}
            placeholder="pk_test_... ou pk_live_..."
            required
          />

          <Input
            label="Secret Key"
            type="password"
            value={form.secret_key || ''}
            onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
            placeholder="sk_test_... ou sk_live_..."
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
            <select
              value={form.environment}
              onChange={(e) => setForm({ ...form, environment: e.target.value as Environment })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Produção</option>
            </select>
          </div>

          <Input
            label="Webhook URL (opcional)"
            value={form.webhook_url || ''}
            onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
            placeholder="https://..."
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Adquirente ativa
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingAcquirer ? 'Salvar Alterações' : 'Criar Adquirente'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={limitsModalOpen}
        onClose={() => setLimitsModalOpen(false)}
        title="Configurar Limites de Transação"
        size="xl"
      >
        {selectedAcquirer && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Adquirente: <strong>{selectedAcquirer.name}</strong>
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-blue-900">Sobre os Limites</p>
                <p className="text-xs text-blue-700 mt-1">
                  Configure valores mínimos, máximos e limites diários/mensais. Os limites de <strong>Entrada</strong> se aplicam tanto para Cash In quanto para Depósitos. Os limites de <strong>Saída</strong> se aplicam para Cash Out. O sistema validará automaticamente antes de processar.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {limits.map((limit, index) => (
                <div key={limit.transaction_type} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      {getTransactionTypeName(limit.transaction_type)}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`active_${index}`}
                        checked={limit.is_active}
                        onChange={(e) => updateLimit(index, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor={`active_${index}`} className="text-xs text-gray-700">
                        Ativo
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor Mínimo (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={limit.min_amount}
                        onChange={(e) =>
                          updateLimit(index, 'min_amount', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        disabled={!limit.is_active}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor Máximo (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={limit.max_amount || ''}
                        onChange={(e) =>
                          updateLimit(
                            index,
                            'max_amount',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Sem limite"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        disabled={!limit.is_active}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Limite Diário (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={limit.daily_limit || ''}
                        onChange={(e) =>
                          updateLimit(
                            index,
                            'daily_limit',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Sem limite"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        disabled={!limit.is_active}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Limite Mensal (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={limit.monthly_limit || ''}
                        onChange={(e) =>
                          updateLimit(
                            index,
                            'monthly_limit',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Sem limite"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        disabled={!limit.is_active}
                      />
                    </div>
                  </div>

                  {limit.is_active && (
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">
                        Range: {formatCurrency(limit.min_amount)} -{' '}
                        {limit.max_amount ? formatCurrency(limit.max_amount) : 'sem limite'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setLimitsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLimits}>Salvar Limites</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
