import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SellerWithConfig, SellerFees, PaymentAcquirer } from '../../types';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency } from '../../utils/format';
import { DollarSign, Search, Building2, AlertCircle, Plus, Trash2, MoveUp, MoveDown, Shield } from 'lucide-react';
import { SellerControlsModal } from '../../components/SellerControlsModal';

interface AcquirerAssignment {
  id: string;
  acquirer_id: string;
  priority: number;
  weight: number;
  is_active: boolean;
  failure_count: number;
  acquirer?: PaymentAcquirer;
}

export function Sellers() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<SellerWithConfig[]>([]);
  const [acquirers, setAcquirers] = useState<PaymentAcquirer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<SellerWithConfig | null>(null);
  const [acquirerModalOpen, setAcquirerModalOpen] = useState(false);
  const [feesModalOpen, setFeesModalOpen] = useState(false);
  const [controlsModalOpen, setControlsModalOpen] = useState(false);

  const [sellerAssignments, setSellerAssignments] = useState<AcquirerAssignment[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    acquirer_id: '',
    priority: 1,
    weight: 100,
  });

  const [feesForm, setFeesForm] = useState<Partial<SellerFees>>({
    fee_type: 'percentage',
    cash_in_fee_percentage: 2.5,
    cash_out_fee_percentage: 2.5,
    cash_in_fee_fixed: 0,
    cash_out_fee_fixed: 0,
    min_fee: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await Promise.all([loadSellers(), loadAcquirers()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSellers() {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'seller')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    const sellersWithConfig = await Promise.all(
      (usersData || []).map(async (user) => {
        const [feesRes, walletRes, assignmentsRes] = await Promise.all([
          supabase
            .from('seller_fees')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('seller_acquirer_assignments')
            .select(`
              *,
              acquirer:payment_acquirers(*)
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('priority', { ascending: true }),
        ]);

        return {
          ...user,
          fees: feesRes.data || undefined,
          wallet: walletRes.data || undefined,
          acquirer_assignments: assignmentsRes.data || [],
        };
      })
    );

    setSellers(sellersWithConfig);
  }

  async function loadAcquirers() {
    const { data, error } = await supabase
      .from('payment_acquirers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    setAcquirers(data || []);
  }

  async function loadSellerAssignments(sellerId: string) {
    const { data } = await supabase
      .from('seller_acquirer_assignments')
      .select(`
        *,
        acquirer:payment_acquirers(*)
      `)
      .eq('user_id', sellerId)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('weight', { ascending: false });

    setSellerAssignments(data || []);
  }

  async function handleAddAssignment() {
    if (!selectedSeller || !newAssignment.acquirer_id || !user) return;

    try {
      const { error } = await supabase
        .from('seller_acquirer_assignments')
        .insert({
          user_id: selectedSeller.id,
          acquirer_id: newAssignment.acquirer_id,
          priority: newAssignment.priority,
          weight: newAssignment.weight,
          assigned_by: user.id,
          is_active: true,
        });

      if (error) throw error;

      setNewAssignment({ acquirer_id: '', priority: 1, weight: 100 });
      await loadSellerAssignments(selectedSeller.id);
      await loadSellers();
    } catch (error) {
      console.error('Error adding assignment:', error);
      alert('Erro ao adicionar adquirente');
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!selectedSeller) return;

    if (!confirm('Tem certeza que deseja remover esta adquirente?')) return;

    try {
      const { error } = await supabase
        .from('seller_acquirer_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      await loadSellerAssignments(selectedSeller.id);
      await loadSellers();
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Erro ao remover adquirente');
    }
  }

  async function handleUpdatePriority(assignmentId: string, newPriority: number) {
    if (!selectedSeller) return;

    try {
      const { error } = await supabase
        .from('seller_acquirer_assignments')
        .update({ priority: newPriority })
        .eq('id', assignmentId);

      if (error) throw error;

      await loadSellerAssignments(selectedSeller.id);
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Erro ao atualizar prioridade');
    }
  }

  async function handleSaveFees() {
    if (!selectedSeller || !user) return;

    try {
      const { error } = await supabase
        .from('seller_fees')
        .upsert({
          user_id: selectedSeller.id,
          ...feesForm,
        });

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedSeller.id,
        type: 'fee_changed',
        title: 'Taxas Atualizadas',
        message: 'Suas taxas de transação foram atualizadas pelo administrador.',
      });

      setFeesModalOpen(false);
      loadSellers();
    } catch (error) {
      console.error('Error saving fees:', error);
      alert('Erro ao salvar taxas');
    }
  }

  function openAcquirerModal(seller: SellerWithConfig) {
    setSelectedSeller(seller);
    loadSellerAssignments(seller.id);
    setNewAssignment({ acquirer_id: '', priority: 1, weight: 100 });
    setAcquirerModalOpen(true);
  }

  function openFeesModal(seller: SellerWithConfig) {
    setSelectedSeller(seller);
    setFeesForm({
      fee_type: seller.fees?.fee_type || 'percentage',
      cash_in_fee_percentage: seller.fees?.cash_in_fee_percentage || 2.5,
      cash_out_fee_percentage: seller.fees?.cash_out_fee_percentage || 2.5,
      cash_in_fee_fixed: seller.fees?.cash_in_fee_fixed || 0,
      cash_out_fee_fixed: seller.fees?.cash_out_fee_fixed || 0,
      min_fee: seller.fees?.min_fee || 0,
      max_fee: seller.fees?.max_fee,
    });
    setFeesModalOpen(true);
  }

  function openControlsModal(seller: SellerWithConfig) {
    setSelectedSeller(seller);
    setControlsModalOpen(true);
  }

  const filteredSellers = sellers.filter((seller) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      seller.name.toLowerCase().includes(search) ||
      seller.email.toLowerCase().includes(search)
    );
  });

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
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Sellers</h1>
        <p className="text-gray-600 mt-1">
          Configure múltiplas adquirentes com fallback e taxas individuais
        </p>
      </div>

      <Card>
        <CardHeader
          title="Sellers"
          subtitle={`${sellers.length} sellers cadastrados`}
        />

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Seller</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">KYC</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Adquirentes</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Taxas</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Saldo</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map((seller) => (
                <tr key={seller.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{seller.name}</p>
                      <p className="text-sm text-gray-500">{seller.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={seller.kyc_status} />
                  </td>
                  <td className="py-3 px-4">
                    {seller.acquirer_assignments && seller.acquirer_assignments.length > 0 ? (
                      <div className="space-y-1">
                        {seller.acquirer_assignments.slice(0, 2).map((assignment: any, idx: number) => (
                          <div key={assignment.id} className="flex items-center space-x-2">
                            <Badge variant={idx === 0 ? 'success' : 'default'}>
                              P{assignment.priority}: {assignment.acquirer?.name}
                            </Badge>
                          </div>
                        ))}
                        {seller.acquirer_assignments.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{seller.acquirer_assignments.length - 2} mais
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="error">Nenhuma</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {seller.fees ? (
                      <span className="text-sm text-gray-900">
                        {seller.fees.cash_in_fee_percentage}%
                      </span>
                    ) : (
                      <Badge variant="warning">Não configurado</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {seller.wallet ? (
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(seller.wallet.balance)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openControlsModal(seller)}
                        title="Controles Administrativos"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAcquirerModal(seller)}
                        title="Gerenciar Adquirentes"
                      >
                        <Building2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openFeesModal(seller)}
                        title="Configurar Taxas"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSellers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum seller encontrado</p>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={acquirerModalOpen}
        onClose={() => setAcquirerModalOpen(false)}
        title="Gerenciar Adquirentes com Fallback"
        size="lg"
      >
        {selectedSeller && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Seller: <strong>{selectedSeller.name}</strong>
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-blue-900">Sistema de Fallback</p>
                <p className="text-xs text-blue-700 mt-1">
                  O sistema tentará as adquirentes em ordem de prioridade. Se uma falhar, automaticamente tenta a próxima.
                  Menor prioridade = tentada primeiro. Maior peso = preferência dentro da mesma prioridade.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Adquirentes Configuradas</h3>
              {sellerAssignments.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    Nenhuma adquirente configurada. Adicione pelo menos uma abaixo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sellerAssignments.map((assignment, index) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={index === 0 ? 'success' : 'default'}>
                            Prioridade {assignment.priority}
                          </Badge>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.acquirer?.name}
                          </p>
                          <span className="text-xs text-gray-500">
                            Peso: {assignment.weight}
                          </span>
                        </div>
                        {assignment.failure_count > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            {assignment.failure_count} falhas registradas
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleUpdatePriority(assignment.id, Math.max(1, assignment.priority - 1))
                          }
                          disabled={assignment.priority === 1}
                          title="Aumentar prioridade"
                        >
                          <MoveUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleUpdatePriority(assignment.id, assignment.priority + 1)
                          }
                          title="Diminuir prioridade"
                        >
                          <MoveDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Adicionar Nova Adquirente</h3>

              {acquirers.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Nenhuma adquirente ativa
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Cadastre uma adquirente na página de Adquirentes antes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adquirente
                    </label>
                    <select
                      value={newAssignment.acquirer_id}
                      onChange={(e) =>
                        setNewAssignment({ ...newAssignment, acquirer_id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {acquirers.map((acquirer) => (
                        <option key={acquirer.id} value={acquirer.id}>
                          {acquirer.name} ({acquirer.environment === 'production' ? 'Produção' : 'Sandbox'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Prioridade (1 = primeira)"
                      type="number"
                      min="1"
                      value={newAssignment.priority}
                      onChange={(e) =>
                        setNewAssignment({
                          ...newAssignment,
                          priority: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <Input
                      label="Peso (0-100)"
                      type="number"
                      min="0"
                      max="100"
                      value={newAssignment.weight}
                      onChange={(e) =>
                        setNewAssignment({
                          ...newAssignment,
                          weight: parseInt(e.target.value) || 100,
                        })
                      }
                    />
                  </div>

                  <Button
                    onClick={handleAddAssignment}
                    disabled={!newAssignment.acquirer_id}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Adquirente
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setAcquirerModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={feesModalOpen}
        onClose={() => setFeesModalOpen(false)}
        title="Configurar Taxas"
        size="lg"
      >
        {selectedSeller && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Seller: <strong>{selectedSeller.name}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Taxa
              </label>
              <select
                value={feesForm.fee_type}
                onChange={(e) =>
                  setFeesForm({
                    ...feesForm,
                    fee_type: e.target.value as 'percentage' | 'fixed' | 'mixed',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="percentage">Percentual</option>
                <option value="fixed">Fixa</option>
                <option value="mixed">Mista (Percentual + Fixa)</option>
              </select>
            </div>

            {(feesForm.fee_type === 'percentage' || feesForm.fee_type === 'mixed') && (
              <>
                <Input
                  label="Taxa Cash-In (%)"
                  type="number"
                  step="0.01"
                  value={feesForm.cash_in_fee_percentage}
                  onChange={(e) =>
                    setFeesForm({
                      ...feesForm,
                      cash_in_fee_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                />

                <Input
                  label="Taxa Cash-Out (%)"
                  type="number"
                  step="0.01"
                  value={feesForm.cash_out_fee_percentage}
                  onChange={(e) =>
                    setFeesForm({
                      ...feesForm,
                      cash_out_fee_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </>
            )}

            {(feesForm.fee_type === 'fixed' || feesForm.fee_type === 'mixed') && (
              <>
                <Input
                  label="Taxa Fixa Cash-In (R$)"
                  type="number"
                  step="0.01"
                  value={feesForm.cash_in_fee_fixed}
                  onChange={(e) =>
                    setFeesForm({
                      ...feesForm,
                      cash_in_fee_fixed: parseFloat(e.target.value) || 0,
                    })
                  }
                />

                <Input
                  label="Taxa Fixa Cash-Out (R$)"
                  type="number"
                  step="0.01"
                  value={feesForm.cash_out_fee_fixed}
                  onChange={(e) =>
                    setFeesForm({
                      ...feesForm,
                      cash_out_fee_fixed: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </>
            )}

            <Input
              label="Taxa Mínima (R$)"
              type="number"
              step="0.01"
              value={feesForm.min_fee}
              onChange={(e) =>
                setFeesForm({
                  ...feesForm,
                  min_fee: parseFloat(e.target.value) || 0,
                })
              }
            />

            <Input
              label="Taxa Máxima (R$) - Opcional"
              type="number"
              step="0.01"
              value={feesForm.max_fee || ''}
              onChange={(e) =>
                setFeesForm({
                  ...feesForm,
                  max_fee: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Preview de Cálculo</p>
              <p className="text-sm text-blue-700">
                Transação de R$ 100,00:{' '}
                <strong>
                  Taxa R${' '}
                  {(
                    ((feesForm.cash_in_fee_percentage || 0) * 100) / 100 +
                    (feesForm.cash_in_fee_fixed || 0)
                  ).toFixed(2)}
                </strong>
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="ghost" onClick={() => setFeesModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFees}>Salvar Taxas</Button>
            </div>
          </div>
        )}
      </Modal>

      {selectedSeller && user && (
        <SellerControlsModal
          isOpen={controlsModalOpen}
          onClose={() => setControlsModalOpen(false)}
          seller={selectedSeller}
          adminId={user.id}
          onSuccess={loadSellers}
        />
      )}
    </div>
  );
}
