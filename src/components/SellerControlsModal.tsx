import { useState } from 'react';
import { adminService } from '../services/admin.service';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Shield,
  ShieldAlert,
  ShieldOff,
  Ban,
  Clock,
  CheckCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  History
} from 'lucide-react';

interface SellerControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: any;
  adminId: string;
  onSuccess: () => void;
}

export function SellerControlsModal({ isOpen, onClose, seller, adminId, onSuccess }: SellerControlsModalProps) {
  const [actionType, setActionType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);

  async function handleAction() {
    if (!reason.trim()) {
      alert('Por favor, informe o motivo da ação');
      return;
    }

    setLoading(true);

    try {
      let updates: any = {
        last_status_change_by: adminId,
        last_status_change_at: new Date().toISOString(),
      };

      let logAction = '';
      let expiresAt = null;

      switch (actionType) {
        case 'suspend':
          updates.account_status = 'suspended';
          updates.account_status_reason = reason;
          expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
          updates.suspension_expires_at = expiresAt.toISOString();
          logAction = 'account_suspended';
          break;

        case 'ban_temporary':
          updates.account_status = 'banned_temporary';
          updates.account_status_reason = reason;
          expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
          updates.suspension_expires_at = expiresAt.toISOString();
          logAction = 'account_banned_temp';
          break;

        case 'ban_permanent':
          updates.account_status = 'banned_permanent';
          updates.account_status_reason = reason;
          updates.suspension_expires_at = null;
          logAction = 'account_banned_permanent';
          break;

        case 'reactivate':
          updates.account_status = 'active';
          updates.account_status_reason = null;
          updates.suspension_expires_at = null;
          updates.withdrawals_blocked = false;
          updates.deposits_blocked = false;
          updates.transactions_blocked = false;
          logAction = 'account_reactivated';
          break;

        case 'block_withdrawals':
          updates.withdrawals_blocked = true;
          updates.withdrawals_blocked_reason = reason;
          logAction = 'withdrawals_blocked';
          break;

        case 'unblock_withdrawals':
          updates.withdrawals_blocked = false;
          updates.withdrawals_blocked_reason = null;
          logAction = 'withdrawals_unblocked';
          break;

        case 'block_deposits':
          updates.deposits_blocked = true;
          updates.deposits_blocked_reason = reason;
          logAction = 'deposits_blocked';
          break;

        case 'unblock_deposits':
          updates.deposits_blocked = false;
          updates.deposits_blocked_reason = null;
          logAction = 'deposits_unblocked';
          break;

        case 'block_transactions':
          updates.transactions_blocked = true;
          updates.transactions_blocked_reason = reason;
          logAction = 'transactions_blocked';
          break;

        case 'unblock_transactions':
          updates.transactions_blocked = false;
          updates.transactions_blocked_reason = null;
          logAction = 'transactions_unblocked';
          break;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', seller.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('seller_action_logs')
        .insert({
          seller_id: seller.id,
          admin_id: adminId,
          action_type: logAction,
          reason: reason,
          expires_at: expiresAt?.toISOString(),
        });

      if (logError) throw logError;

      await supabase.from('notifications').insert({
        user_id: seller.id,
        type: 'account_action',
        title: 'Ação Administrativa',
        message: reason,
      });

      alert('Ação executada com sucesso!');
      setShowActionForm(false);
      setActionType('');
      setReason('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Erro ao executar ação');
    } finally {
      setLoading(false);
    }
  }

  function startAction(type: string) {
    setActionType(type);
    setShowActionForm(true);
  }

  const getAccountStatusBadge = () => {
    const status = seller.account_status || 'active';
    switch (status) {
      case 'active':
        return <Badge variant="success">Ativa</Badge>;
      case 'suspended':
        return <Badge variant="warning">Suspensa</Badge>;
      case 'banned_temporary':
        return <Badge variant="error">Banido Temporário</Badge>;
      case 'banned_permanent':
        return <Badge variant="error">Banido Permanente</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'suspend': return 'Suspender Conta';
      case 'ban_temporary': return 'Banir Temporariamente';
      case 'ban_permanent': return 'Banir Permanentemente';
      case 'reactivate': return 'Reativar Conta';
      case 'block_withdrawals': return 'Bloquear Saques';
      case 'unblock_withdrawals': return 'Desbloquear Saques';
      case 'block_deposits': return 'Bloquear Depósitos';
      case 'unblock_deposits': return 'Desbloquear Depósitos';
      case 'block_transactions': return 'Bloquear Transações';
      case 'unblock_transactions': return 'Desbloquear Transações';
      default: return 'Ação Administrativa';
    }
  };

  const needsExpiration = ['suspend', 'ban_temporary'].includes(actionType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Controles Administrativos"
      size="xl"
    >
      {seller && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">{seller.name}</p>
                <p className="text-sm text-gray-500">{seller.email}</p>
              </div>
              {getAccountStatusBadge()}
            </div>

            {seller.account_status_reason && (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-yellow-900">Motivo do Status:</p>
                <p className="text-sm text-yellow-700 mt-1">{seller.account_status_reason}</p>
              </div>
            )}
          </div>

          {!showActionForm ? (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Status da Conta</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => startAction('suspend')}
                    disabled={seller.account_status === 'suspended'}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Suspender Conta
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => startAction('ban_temporary')}
                    disabled={seller.account_status === 'banned_temporary'}
                  >
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Banir Temporário
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start text-red-600"
                    onClick={() => startAction('ban_permanent')}
                    disabled={seller.account_status === 'banned_permanent'}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Banir Permanente
                  </Button>

                  <Button
                    variant="ghost"
                    className="justify-start text-green-600"
                    onClick={() => startAction('reactivate')}
                    disabled={seller.account_status === 'active'}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reativar Conta
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Controles de Operações</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArrowDownToLine className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Saques</p>
                        {seller.withdrawals_blocked_reason && (
                          <p className="text-xs text-gray-600">{seller.withdrawals_blocked_reason}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={seller.withdrawals_blocked ? 'default' : 'ghost'}
                      onClick={() => startAction(seller.withdrawals_blocked ? 'unblock_withdrawals' : 'block_withdrawals')}
                    >
                      {seller.withdrawals_blocked ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ArrowUpFromLine className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Depósitos</p>
                        {seller.deposits_blocked_reason && (
                          <p className="text-xs text-gray-600">{seller.deposits_blocked_reason}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={seller.deposits_blocked ? 'default' : 'ghost'}
                      onClick={() => startAction(seller.deposits_blocked ? 'unblock_deposits' : 'block_deposits')}
                    >
                      {seller.deposits_blocked ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Transações</p>
                        {seller.transactions_blocked_reason && (
                          <p className="text-xs text-gray-600">{seller.transactions_blocked_reason}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={seller.transactions_blocked ? 'default' : 'ghost'}
                      onClick={() => startAction(seller.transactions_blocked ? 'unblock_transactions' : 'block_transactions')}
                    >
                      {seller.transactions_blocked ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="ghost" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900">{getActionTitle()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo da Ação *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explique detalhadamente o motivo desta ação..."
                  required
                />
              </div>

              {needsExpiration && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (dias)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Expira em: {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-red-900">Atenção</p>
                <p className="text-xs text-red-700 mt-1">
                  Esta ação será registrada e notificará o seller. Certifique-se de fornecer um motivo claro.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowActionForm(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleAction} disabled={loading || !reason.trim()}>
                  {loading ? 'Executando...' : 'Confirmar Ação'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
