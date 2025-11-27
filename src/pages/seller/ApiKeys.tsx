import { useEffect, useState } from 'react';
import { sellerService } from '../../services/seller.service';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ApiKey } from '../../types';
import { generateClientId, generateClientSecret, hashSecret } from '../../utils/format';
import { formatDate } from '../../utils/format';
import { Key, Copy, Trash2, Plus } from 'lucide-react';

export function ApiKeys() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  async function loadApiKeys() {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) {
      alert('Por favor, forneça um nome para a chave');
      return;
    }

    try {
      const clientId = generateClientId();
      const clientSecret = generateClientSecret();
      const clientSecretHash = await hashSecret(clientSecret);

      const { error } = await supabase
        .from('api_keys')
        .insert([
          {
            user_id: user?.id,
            client_id: clientId,
            client_secret_hash: clientSecretHash,
            name: newKeyName,
            is_active: true,
          },
        ]);

      if (error) throw error;

      setNewKeyData({ clientId, clientSecret });
      setShowCreateModal(false);
      setShowSecretModal(true);
      setNewKeyName('');
      await loadApiKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Erro ao criar chave API');
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta chave? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Erro ao excluir chave API');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Chaves API</h1>
          <p className="text-gray-600 mt-1">Gerencie suas chaves de integração</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={user?.kyc_status !== 'approved'}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Chave</span>
        </Button>
      </div>

      {user?.kyc_status !== 'approved' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            Você precisa ter sua conta aprovada para criar chaves API.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title="Chaves Ativas" />
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma chave API criada</p>
              <p className="text-sm text-gray-400 mt-1">
                Crie uma chave para começar a integração
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{key.name}</p>
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      <div>
                        <p className="text-xs text-gray-500">Client ID</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-sm font-mono text-gray-700">
                            {key.client_id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(key.client_id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Criada em {formatDate(key.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Criar Nova Chave API"
      >
        <div className="space-y-4">
          <Input
            label="Nome da Chave"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Ex: Produção, Desenvolvimento, Loja Online"
          />
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateKey}>
              Criar Chave
            </Button>
          </div>
        </div>
      </Modal>

      {newKeyData && (
        <Modal
          isOpen={showSecretModal}
          onClose={() => {
            setShowSecretModal(false);
            setNewKeyData(null);
          }}
          title="Chave Criada com Sucesso"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">
                Atenção: Salve estas credenciais agora!
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                O Client Secret não será exibido novamente por motivos de segurança.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                  {newKeyData.clientId}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(newKeyData.clientId)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                  {newKeyData.clientSecret}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(newKeyData.clientSecret)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowSecretModal(false);
                  setNewKeyData(null);
                }}
              >
                Entendi
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
