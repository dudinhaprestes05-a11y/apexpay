import { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { DefaultFeesConfig, FeeType } from '../../types';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function GlobalConfig() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingFees, setSavingFees] = useState(false);
  const [defaultFees, setDefaultFees] = useState<Partial<DefaultFeesConfig>>({
    fee_type: 'percentage',
    cash_in_fee_percentage: 2.50,
    cash_out_fee_percentage: 2.50,
    cash_in_fee_fixed: 0,
    cash_out_fee_fixed: 0,
    min_fee: 0,
  });
  const [feesMessage, setFeesMessage] = useState('');

  useEffect(() => {
    loadDefaultFees();
  }, []);

  async function loadDefaultFees() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('default_fees_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDefaultFees(data);
      }
    } catch (error) {
      console.error('Error loading default fees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFees() {
    if (!user) return;

    setSavingFees(true);
    setFeesMessage('');

    try {
      const { error } = await supabase
        .from('default_fees_config')
        .upsert({
          id: defaultFees.id,
          fee_type: defaultFees.fee_type,
          cash_in_fee_percentage: defaultFees.cash_in_fee_percentage,
          cash_out_fee_percentage: defaultFees.cash_out_fee_percentage,
          cash_in_fee_fixed: defaultFees.cash_in_fee_fixed,
          cash_out_fee_fixed: defaultFees.cash_out_fee_fixed,
          min_fee: defaultFees.min_fee,
          max_fee: defaultFees.max_fee,
          updated_by: user.id,
        });

      if (error) throw error;

      setFeesMessage('Taxas padrão salvas com sucesso!');
      setTimeout(() => setFeesMessage(''), 3000);
      loadDefaultFees();
    } catch (error) {
      console.error('Error saving default fees:', error);
      setFeesMessage('Erro ao salvar taxas padrão');
    } finally {
      setSavingFees(false);
    }
  }

  const calculatePreviewFee = (amount: number) => {
    const percentageFee = (defaultFees.cash_in_fee_percentage || 0) * amount / 100;
    const fixedFee = defaultFees.cash_in_fee_fixed || 0;
    let total = percentageFee + fixedFee;

    if (defaultFees.min_fee && total < defaultFees.min_fee) {
      total = defaultFees.min_fee;
    }
    if (defaultFees.max_fee && total > defaultFees.max_fee) {
      total = defaultFees.max_fee;
    }

    return total;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuração Global</h1>
        <p className="text-gray-600 mt-1">
          Configure as taxas padrão aplicadas aos novos sellers
        </p>
      </div>

      <Card>
        <CardHeader
          title="Taxas Padrão para Novos Sellers"
          subtitle="Estas taxas são aplicadas automaticamente quando um seller é aprovado no KYC"
        />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Taxa
            </label>
            <select
              value={defaultFees.fee_type}
              onChange={(e) =>
                setDefaultFees({
                  ...defaultFees,
                  fee_type: e.target.value as FeeType,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="percentage">Percentual</option>
              <option value="fixed">Fixa</option>
              <option value="mixed">Mista (Percentual + Fixa)</option>
            </select>
          </div>

          {(defaultFees.fee_type === 'percentage' || defaultFees.fee_type === 'mixed') && (
            <>
              <Input
                label="Taxa Cash-In (%)"
                type="number"
                step="0.01"
                value={defaultFees.cash_in_fee_percentage}
                onChange={(e) =>
                  setDefaultFees({
                    ...defaultFees,
                    cash_in_fee_percentage: parseFloat(e.target.value) || 0,
                  })
                }
              />

              <Input
                label="Taxa Cash-Out (%)"
                type="number"
                step="0.01"
                value={defaultFees.cash_out_fee_percentage}
                onChange={(e) =>
                  setDefaultFees({
                    ...defaultFees,
                    cash_out_fee_percentage: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </>
          )}

          {(defaultFees.fee_type === 'fixed' || defaultFees.fee_type === 'mixed') && (
            <>
              <Input
                label="Taxa Fixa Cash-In (R$)"
                type="number"
                step="0.01"
                value={defaultFees.cash_in_fee_fixed}
                onChange={(e) =>
                  setDefaultFees({
                    ...defaultFees,
                    cash_in_fee_fixed: parseFloat(e.target.value) || 0,
                  })
                }
              />

              <Input
                label="Taxa Fixa Cash-Out (R$)"
                type="number"
                step="0.01"
                value={defaultFees.cash_out_fee_fixed}
                onChange={(e) =>
                  setDefaultFees({
                    ...defaultFees,
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
            value={defaultFees.min_fee}
            onChange={(e) =>
              setDefaultFees({
                ...defaultFees,
                min_fee: parseFloat(e.target.value) || 0,
              })
            }
          />

          <Input
            label="Taxa Máxima (R$) - Opcional"
            type="number"
            step="0.01"
            value={defaultFees.max_fee || ''}
            onChange={(e) =>
              setDefaultFees({
                ...defaultFees,
                max_fee: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
          />

          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-900">Preview de Cálculo</p>
            <div className="space-y-1 text-sm text-blue-700">
              <p>Transação de R$ 100,00 = Taxa de <strong>R$ {calculatePreviewFee(100).toFixed(2)}</strong></p>
              <p>Transação de R$ 500,00 = Taxa de <strong>R$ {calculatePreviewFee(500).toFixed(2)}</strong></p>
              <p>Transação de R$ 1.000,00 = Taxa de <strong>R$ {calculatePreviewFee(1000).toFixed(2)}</strong></p>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Importante:</strong> Estas taxas serão aplicadas automaticamente a todos os novos sellers.
              Você pode ajustar individualmente na página de Gestão de Sellers após a aprovação do KYC.
            </p>
          </div>

          {feesMessage && (
            <div
              className={`p-3 rounded-lg ${
                feesMessage.includes('sucesso')
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              <p className="text-sm">{feesMessage}</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveFees} disabled={savingFees}>
              <Save className="w-4 h-4 mr-2" />
              {savingFees ? 'Salvando...' : 'Salvar Taxas Padrão'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Informações" subtitle="Como funciona a configuração" />

        <div className="prose prose-sm max-w-none">
          <h4 className="font-semibold text-gray-900">Hierarquia de Adquirentes</h4>
          <ol className="text-sm text-gray-700 space-y-2">
            <li>
              <strong>Adquirente Atribuída:</strong> Cada seller recebe uma adquirente específica atribuída pelo administrador.
            </li>
            <li>
              <strong>Múltiplas Contas:</strong> Você pode cadastrar várias adquirentes e distribuir sellers entre elas.
            </li>
            <li>
              <strong>Controle Centralizado:</strong> Sellers não configuram credenciais, apenas recebem atribuições.
            </li>
          </ol>

          <h4 className="font-semibold text-gray-900 mt-4">Taxas Padrão</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Aplicadas automaticamente quando KYC é aprovado</li>
            <li>• Podem ser ajustadas individualmente por seller</li>
            <li>• Alterações não afetam sellers já cadastrados</li>
          </ul>

          <h4 className="font-semibold text-gray-900 mt-4">Segurança</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Nunca compartilhe suas Secret Keys publicamente</li>
            <li>• Use ambiente Sandbox para testes</li>
            <li>• Rotacione suas chaves periodicamente</li>
            <li>• Monitore logs de webhook para atividades suspeitas</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
