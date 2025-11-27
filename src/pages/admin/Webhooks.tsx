import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { WebhookLog } from '../../types';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { Code, Search } from 'lucide-react';
import { Input } from '../../components/ui/Input';

export function Webhooks() {
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWebhooks();

    const subscription = supabase
      .channel('webhook_logs_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webhook_logs' },
        (payload) => {
          setWebhooks(prev => [payload.new as WebhookLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadWebhooks() {
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredWebhooks = webhooks.filter(webhook => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      webhook.transaction_id?.toLowerCase().includes(search) ||
      webhook.event_type.toLowerCase().includes(search) ||
      webhook.provider.toLowerCase().includes(search)
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
        <h1 className="text-2xl font-bold text-gray-900">Debug de Webhooks</h1>
        <p className="text-gray-600 mt-1">
          Monitore todos os webhooks recebidos das adquirentes
        </p>
      </div>

      <Card>
        <CardHeader
          title="Logs de Webhooks"
          subtitle={`${webhooks.length} webhooks recebidos`}
        />

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por ID de transação, tipo de evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredWebhooks.length === 0 ? (
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum webhook recebido ainda</p>
              <p className="text-sm text-gray-400 mt-1">
                Os webhooks das adquirentes aparecerão aqui automaticamente
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Provider</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Evento</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Transação</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status HTTP</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredWebhooks.map((webhook) => (
                  <tr
                    key={webhook.id}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedWebhook(webhook)}
                  >
                    <td className="py-3 px-4 text-sm font-mono text-gray-900">
                      {webhook.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <Badge variant="info">{webhook.provider}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {webhook.event_type}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-600">
                      {webhook.transaction_id || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={webhook.http_status === 200 ? 'success' : 'danger'}>
                        {webhook.http_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatRelativeTime(webhook.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {selectedWebhook && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedWebhook(null)}
          title="Detalhes do Webhook"
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ID</p>
                <p className="font-mono text-sm text-gray-900">{selectedWebhook.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Provider</p>
                <p className="font-medium text-gray-900">{selectedWebhook.provider}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo de Evento</p>
                <p className="font-medium text-gray-900">{selectedWebhook.event_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status HTTP</p>
                <Badge variant={selectedWebhook.http_status === 200 ? 'success' : 'danger'}>
                  {selectedWebhook.http_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">ID da Transação</p>
                <p className="font-mono text-sm text-gray-900">
                  {selectedWebhook.transaction_id || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data e Hora</p>
                <p className="text-sm text-gray-900">{formatDate(selectedWebhook.created_at)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2 font-medium">Payload JSON</p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono">
                  {JSON.stringify(selectedWebhook.payload_json, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(selectedWebhook.payload_json, null, 2)
                  );
                  alert('JSON copiado para a área de transferência!');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Copiar JSON
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
