import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DepositService, Deposit } from '../../services/deposit.service';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Wallet as WalletType, Transaction } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/format';
import {
  Wallet as WalletIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  QrCode
} from 'lucide-react';

export function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [creatingDeposit, setCreatingDeposit] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<Deposit | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  async function loadWalletData() {
    try {
      const [walletResult, transactionsResult, depositsResult] = await Promise.all([
        supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle(),
        supabase
          .from('seller_transactions')
          .select('*')
          .eq('user_id', user?.id)
          .in('status', ['paid', 'processing'])
          .order('created_at', { ascending: false })
          .limit(20),
        DepositService.getDeposits(user?.id || ''),
      ]);

      if (walletResult.data) setWallet(walletResult.data);
      if (transactionsResult.data) setTransactions(transactionsResult.data);
      setDeposits(depositsResult);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDeposit() {
    if (!user?.id) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    setCreatingDeposit(true);

    try {
      const result = await DepositService.createDeposit(user.id, { amount });

      if (result.success && result.deposit) {
        setActiveDeposit(result.deposit);
        setDepositModalOpen(false);
        setDepositAmount('');
        await loadWalletData();
      } else {
        alert(result.error || 'Erro ao criar depósito');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      alert('Erro ao criar depósito. Tente novamente.');
    } finally {
      setCreatingDeposit(false);
    }
  }

  async function handleCopyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  function getDepositStatusIcon(status: string) {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'expired':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  }

  function getDepositStatusText(status: string) {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Aguardando';
      case 'expired':
        return 'Expirado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  const pendingDeposit = deposits.find(d => d.status === 'pending');

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
        <h1 className="text-2xl font-bold text-gray-900">Minha Carteira</h1>
        <p className="text-gray-600 mt-1">Gerencie seu saldo e transações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-4 rounded-full">
              <WalletIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Saldo Disponível</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(wallet?.balance || 0)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              onClick={() => setDepositModalOpen(true)}
              disabled={user?.kyc_status !== 'approved'}
              variant="outline"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Depositar
            </Button>
            <Button
              disabled={user?.kyc_status !== 'approved' || !wallet?.balance || wallet.balance <= 0}
              className="w-full"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Sacar
            </Button>
          </div>
          {user?.kyc_status !== 'approved' && (
            <p className="text-xs text-red-600 mt-2 text-center">KYC precisa estar aprovado</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-orange-100 p-4 rounded-full">
              <WalletIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo Congelado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(wallet?.frozen_balance || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Saques em processamento</p>
            </div>
          </div>
        </Card>
      </div>

      {activeDeposit && activeDeposit.status === 'pending' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Depósito Pendente</h3>
                <p className="text-sm text-yellow-700">
                  Valor: {formatCurrency(parseFloat(activeDeposit.amount.toString()))}
                </p>
              </div>
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>

            {activeDeposit.pix_qr_code_base64 && (
              <div className="bg-white p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-3">Escaneie o QR Code</p>
                <img
                  src={`data:image/png;base64,${activeDeposit.pix_qr_code_base64}`}
                  alt="QR Code PIX"
                  className="mx-auto w-48 h-48"
                />
              </div>
            )}

            {activeDeposit.pix_copy_paste && (
              <div>
                <p className="text-sm text-gray-700 mb-2">Ou copie o código PIX:</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={activeDeposit.pix_copy_paste}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      handleCopyToClipboard(activeDeposit.pix_copy_paste!, 'pix')
                    }
                  >
                    {copiedText === 'pix' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Expira em:</strong>{' '}
                {activeDeposit.expires_at
                  ? formatRelativeTime(activeDeposit.expires_at)
                  : '30 minutos'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Após o pagamento, o saldo será creditado automaticamente em sua carteira.
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={() => setActiveDeposit(null)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </Card>
      )}

      {deposits.length > 0 && (
        <Card>
          <CardHeader title="Histórico de Depósitos" />
          <div className="space-y-2">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  if (deposit.status === 'pending') {
                    setActiveDeposit(deposit);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  {getDepositStatusIcon(deposit.status)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(parseFloat(deposit.amount.toString()))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(deposit.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-700">
                    {getDepositStatusText(deposit.status)}
                  </span>
                  {deposit.status === 'pending' && (
                    <p className="text-xs text-blue-600">Clique para ver QR Code</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Histórico de Transações" />
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma transação no histórico</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Valor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    Descrição
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {transaction.type === 'cash_in' ? (
                          <ArrowDownCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {transaction.type === 'cash_in' ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`py-3 px-4 text-sm font-semibold ${
                        transaction.type === 'cash_in'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'cash_in' ? '+' : '-'}
                      {formatCurrency(parseFloat(transaction.amount.toString()))}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatRelativeTime(transaction.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {transaction.customer_data?.name || 'Transação Pix'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        isOpen={depositModalOpen}
        onClose={() => {
          setDepositModalOpen(false);
          setDepositAmount('');
        }}
        title="Depositar via PIX"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <QrCode className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Como funciona?</p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                  <li>Escolha o valor que deseja depositar</li>
                  <li>Será gerado um QR Code PIX para pagamento</li>
                  <li>Após o pagamento, o saldo é creditado automaticamente</li>
                  <li>Valor mínimo: R$ 1,00</li>
                </ul>
              </div>
            </div>
          </div>

          <Input
            label="Valor do Depósito"
            type="number"
            min="1"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0,00"
            required
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setDepositModalOpen(false);
                setDepositAmount('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDeposit}
              disabled={creatingDeposit || !depositAmount || parseFloat(depositAmount) < 1}
            >
              {creatingDeposit ? 'Gerando QR Code...' : 'Gerar QR Code PIX'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
