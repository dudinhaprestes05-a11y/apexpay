import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, KYCDocument, UserDetails } from '../../types';
import { KYCDocumentService } from '../../services/kyc-document.service';
import { Card, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate } from '../../utils/format';
import {
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  User as UserIcon,
  X
} from 'lucide-react';

interface SellerWithDetails extends User {
  documents?: KYCDocument[];
  user_details?: UserDetails;
}

export function KYCApprovals() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<SellerWithDetails[]>([]);
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSellers();
  }, []);

  async function loadSellers() {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'seller')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const sellersWithDetails = await Promise.all(
        (usersData || []).map(async (seller) => {
          const [docsRes, detailsRes] = await Promise.all([
            supabase
              .from('kyc_documents')
              .select('*')
              .eq('user_id', seller.id)
              .order('uploaded_at', { ascending: false }),
            supabase
              .from('user_details')
              .select('*')
              .eq('user_id', seller.id)
              .maybeSingle(),
          ]);

          return {
            ...seller,
            documents: docsRes.data || [],
            user_details: detailsRes.data || undefined,
          };
        })
      );

      setSellers(sellersWithDetails);
    } catch (error) {
      console.error('Error loading sellers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(sellerId: string) {
    if (!user) return;

    setActionLoading(true);
    try {
      await supabase
        .from('users')
        .update({ kyc_status: 'approved', rejection_reason: null })
        .eq('id', sellerId);

      const seller = sellers.find(s => s.id === sellerId);
      if (seller?.documents) {
        for (const doc of seller.documents) {
          await KYCDocumentService.updateDocumentStatus(
            doc.id,
            'approved',
            user.id
          );
        }
      }

      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'kyc_approved',
        title: 'KYC Aprovado!',
        message: 'Seu KYC foi aprovado. Agora você pode criar transações e processar pagamentos.',
      });

      await loadSellers();
      setExpandedSeller(null);
      alert('Seller aprovado com sucesso!');
    } catch (error) {
      console.error('Error approving seller:', error);
      alert('Erro ao aprovar seller');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(sellerId: string) {
    if (!user || !rejectionReason.trim()) {
      alert('Por favor, forneça um motivo para a rejeição');
      return;
    }

    setActionLoading(true);
    try {
      await supabase
        .from('users')
        .update({ kyc_status: 'rejected', rejection_reason: rejectionReason })
        .eq('id', sellerId);

      await supabase.from('notifications').insert({
        user_id: sellerId,
        type: 'kyc_rejected',
        title: 'KYC Rejeitado',
        message: `Seu KYC foi rejeitado. Motivo: ${rejectionReason}`,
      });

      await loadSellers();
      setRejectionModalOpen(false);
      setSelectedSeller(null);
      setRejectionReason('');
      setExpandedSeller(null);
      alert('Seller rejeitado');
    } catch (error) {
      console.error('Error rejecting seller:', error);
      alert('Erro ao rejeitar seller');
    } finally {
      setActionLoading(false);
    }
  }

  function openRejectionModal(seller: SellerWithDetails) {
    setSelectedSeller(seller);
    setRejectionModalOpen(true);
  }

  const pendingSellers = sellers.filter(s => s.kyc_status === 'pending');
  const approvedSellers = sellers.filter(s => s.kyc_status === 'approved');
  const rejectedSellers = sellers.filter(s => s.kyc_status === 'rejected');

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
        <h1 className="text-2xl font-bold text-gray-900">Aprovações KYC</h1>
        <p className="text-gray-600 mt-1">
          Revise documentos e aprove solicitações de sellers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-900">{pendingSellers.length}</p>
            <p className="text-sm text-yellow-700 mt-1">Pendentes</p>
          </div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-900">{approvedSellers.length}</p>
            <p className="text-sm text-green-700 mt-1">Aprovados</p>
          </div>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-900">{rejectedSellers.length}</p>
            <p className="text-sm text-red-700 mt-1">Rejeitados</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Todos os Sellers" subtitle={`${sellers.length} sellers cadastrados`} />
        <div className="space-y-2">
          {sellers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum seller cadastrado</p>
          ) : (
            sellers.map((seller) => {
              const isExpanded = expandedSeller === seller.id;
              const documentCount = seller.documents?.length || 0;

              return (
                <div key={seller.id} className="border rounded-lg">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedSeller(isExpanded ? null : seller.id)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-2 rounded-full ${
                        seller.kyc_status === 'approved' ? 'bg-green-100' :
                        seller.kyc_status === 'rejected' ? 'bg-red-100' :
                        'bg-yellow-100'
                      }`}>
                        <UserIcon className={`w-5 h-5 ${
                          seller.kyc_status === 'approved' ? 'text-green-600' :
                          seller.kyc_status === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{seller.name}</p>
                        <p className="text-sm text-gray-500">{seller.email}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <StatusBadge status={seller.kyc_status} />
                        <p className="text-xs text-gray-500 mt-1">
                          {documentCount} {documentCount === 1 ? 'documento' : 'documentos'}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 ml-2" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t bg-gray-50 space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Informações do Seller</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium text-gray-900">{seller.email}</p>
                          </div>
                          {seller.user_details?.phone && (
                            <div>
                              <p className="text-xs text-gray-500">Telefone</p>
                              <p className="text-sm font-medium text-gray-900">
                                {seller.user_details.phone}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500">Tipo</p>
                            <p className="text-sm font-medium text-gray-900">
                              {seller.user_details?.document_type === 'cnpj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Data de Cadastro</p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(seller.created_at)}
                            </p>
                          </div>
                          {seller.user_details?.document_type === 'cnpj' && (
                            <>
                              {seller.user_details.company_legal_name && (
                                <div>
                                  <p className="text-xs text-gray-500">Razão Social</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {seller.user_details.company_legal_name}
                                  </p>
                                </div>
                              )}
                              {seller.user_details.legal_representative_name && (
                                <div>
                                  <p className="text-xs text-gray-500">Responsável Legal</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {seller.user_details.legal_representative_name}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {seller.documents && seller.documents.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Documentos KYC ({seller.documents.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {seller.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="bg-white border rounded-lg p-3 cursor-pointer hover:border-blue-500 transition"
                                onClick={() => setPreviewUrl(doc.file_url)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <FileText className="w-5 h-5 text-gray-600" />
                                  {doc.status === 'approved' && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                  {doc.status === 'rejected' && (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                </div>
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {doc.document_type.replace(/_/g, ' ').toUpperCase()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {doc.file_name}
                                </p>
                                {doc.status === 'rejected' && doc.rejection_reason && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {doc.rejection_reason}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {seller.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <p className="text-sm font-medium text-red-900 mb-1">Motivo da Rejeição</p>
                          <p className="text-sm text-red-700">{seller.rejection_reason}</p>
                        </div>
                      )}

                      {seller.kyc_status === 'pending' && (
                        <div className="flex space-x-3 pt-3 border-t">
                          <Button
                            onClick={() => handleApprove(seller.id)}
                            disabled={actionLoading}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Aprovar KYC</span>
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => openRejectionModal(seller)}
                            disabled={actionLoading}
                            className="flex items-center space-x-2"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Rejeitar KYC</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            {previewUrl.endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                className="w-full h-[80vh] bg-white rounded-lg"
                title="Document Preview"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Document Preview"
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setSelectedSeller(null);
          setRejectionReason('');
        }}
        title="Rejeitar KYC"
        size="md"
      >
        {selectedSeller && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Você está rejeitando o KYC de: <strong>{selectedSeller.name}</strong>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Rejeição *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Explique claramente o motivo para que o seller possa corrigir..."
                required
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-xs text-yellow-800">
                O seller receberá uma notificação com este motivo e poderá corrigir os documentos.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectionModalOpen(false);
                  setSelectedSeller(null);
                  setRejectionReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleReject(selectedSeller.id)}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
