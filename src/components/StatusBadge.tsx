import { Badge } from './ui/Badge';
import { KYCStatus, TransactionStatus } from '../types';

interface StatusBadgeProps {
  status: KYCStatus | TransactionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
    pending: { variant: 'warning', label: 'Pendente' },
    approved: { variant: 'success', label: 'Aprovado' },
    rejected: { variant: 'danger', label: 'Rejeitado' },
    paid: { variant: 'success', label: 'Pago' },
    refused: { variant: 'danger', label: 'Recusado' },
    cancelled: { variant: 'default', label: 'Cancelado' },
    processing: { variant: 'info', label: 'Processando' },
    waiting_payment: { variant: 'warning', label: 'Aguardando Pagamento' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
