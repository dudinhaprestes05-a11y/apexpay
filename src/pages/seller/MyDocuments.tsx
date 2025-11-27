import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { sellerService } from '../../services/seller.service';
import { KYCDocumentService } from '../../services/kyc-document.service';
import { KYCDocument, KYCDocumentType, DocumentType } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  X,
  Eye,
  Trash2
} from 'lucide-react';

export function MyDocuments() {
  const { user, refreshUser } = useAuth();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('cpf');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    loadUserDetails();
  }, [user?.id]);

  async function loadUserDetails() {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('user_details')
        .select('document_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.document_type) {
        setDocumentType(data.document_type);
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  }

  async function loadDocuments() {
    if (!user?.id) return;

    try {
      const docs = await KYCDocumentService.getDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(docType: KYCDocumentType, file: File) {
    if (!user?.id) return;

    const validation = KYCDocumentService.validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploading(true);

    try {
      const result = await KYCDocumentService.uploadDocument(user.id, docType, file);

      if (result.success) {
        await loadDocuments();
        alert('Documento enviado com sucesso!');
      } else {
        alert(result.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!user?.id || !confirm('Deseja realmente excluir este documento?')) return;

    try {
      const success = await KYCDocumentService.deleteDocument(documentId, user.id);
      if (success) {
        await loadDocuments();
        alert('Documento excluído com sucesso!');
      } else {
        alert('Não foi possível excluir o documento');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Erro ao excluir documento');
    }
  }

  async function handleSubmitForReview() {
    if (!user?.id) return;

    const requiredDocs = KYCDocumentService.getRequiredDocuments(documentType);
    const uploadedTypes = documents.map(d => d.document_type);
    const missingDocs = requiredDocs.filter(rd => !uploadedTypes.includes(rd.type));

    if (missingDocs.length > 0) {
      alert(`Você ainda precisa enviar: ${missingDocs.map(d => d.label).join(', ')}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ kyc_status: 'pending' })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'kyc_approved',
        title: 'Documentos Enviados',
        message: 'Seus documentos foram enviados para análise. Você será notificado em breve.',
      });

      await refreshUser();
      alert('Documentos enviados para análise!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Erro ao enviar para análise');
    }
  }

  const requiredDocuments = KYCDocumentService.getRequiredDocuments(documentType);
  const uploadedTypes = documents.map(d => d.document_type);
  const allDocsUploaded = requiredDocuments.every(rd => uploadedTypes.includes(rd.type));
  const uploadProgress = `${uploadedTypes.length}/${requiredDocuments.length}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Documentos KYC</h1>
        <p className="text-gray-600 mt-1">
          Envie seus documentos para verificação de identidade
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${
              user?.kyc_status === 'approved' ? 'bg-green-100' :
              user?.kyc_status === 'rejected' ? 'bg-red-100' :
              'bg-yellow-100'
            }`}>
              {user?.kyc_status === 'approved' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : user?.kyc_status === 'rejected' ? (
                <AlertCircle className="w-6 h-6 text-red-600" />
              ) : (
                <Clock className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">Status da Verificação</p>
              <div className="mt-1">
                <StatusBadge status={user?.kyc_status || 'pending'} />
              </div>
            </div>
          </div>

          {user?.kyc_status !== 'approved' && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Progresso</p>
              <p className="text-2xl font-bold text-blue-600">{uploadProgress}</p>
            </div>
          )}
        </div>

        {user?.kyc_status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-yellow-800">
              Seus documentos estão em análise. Você será notificado quando a verificação for concluída.
            </p>
          </div>
        )}

        {user?.kyc_status === 'rejected' && user?.rejection_reason && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
            <p className="text-sm font-medium text-red-900 mb-2">Motivo da Rejeição:</p>
            <p className="text-sm text-red-700">{user.rejection_reason}</p>
            <p className="text-sm text-red-700 mt-2">
              Por favor, corrija os documentos e envie novamente.
            </p>
          </div>
        )}

        {user?.kyc_status === 'approved' && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-green-800">
              Sua conta foi aprovada! Você já pode criar transações e usar todas as funcionalidades.
            </p>
          </div>
        )}
      </Card>

      {user?.kyc_status !== 'approved' && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Documentos Necessários ({documentType === 'cpf' ? 'Pessoa Física' : 'Pessoa Jurídica'})
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
              {requiredDocuments.map((doc) => (
                <li key={doc.type}>{doc.label} - {doc.description}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredDocuments.map((docInfo) => {
              const existingDoc = documents.find(d => d.document_type === docInfo.type);

              return (
                <Card key={docInfo.type}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{docInfo.label}</h4>
                      <p className="text-xs text-gray-500 mt-1">{docInfo.description}</p>
                    </div>
                    {existingDoc && (
                      <div className="flex-shrink-0">
                        {existingDoc.status === 'approved' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {existingDoc.status === 'rejected' && (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        {existingDoc.status === 'pending' && (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                    )}
                  </div>

                  {existingDoc ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span className="text-sm text-gray-700 truncate">
                              {existingDoc.file_name}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => setPreviewUrl(existingDoc.file_url)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            {existingDoc.status === 'pending' && (
                              <button
                                onClick={() => handleDeleteDocument(existingDoc.id)}
                                className="p-1 hover:bg-red-100 rounded"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {existingDoc.status === 'rejected' && existingDoc.rejection_reason && (
                        <div className="bg-red-50 p-2 rounded text-xs text-red-700">
                          <strong>Motivo:</strong> {existingDoc.rejection_reason}
                        </div>
                      )}

                      {existingDoc.status === 'rejected' && (
                        <label className="block">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(docInfo.type, file);
                            }}
                            className="hidden"
                            disabled={uploading}
                          />
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                            <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">Enviar Novamente</p>
                          </div>
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(docInfo.type, file);
                        }}
                        className="hidden"
                        disabled={uploading}
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">
                          {uploading ? 'Enviando...' : 'Clique para selecionar'}
                        </p>
                        <p className="text-xs text-gray-500">JPG, PNG ou PDF (máx. 5MB)</p>
                      </div>
                    </label>
                  )}
                </Card>
              );
            })}
          </div>

          {allDocsUploaded && user?.kyc_status !== 'pending' && (
            <div className="flex justify-center">
              <Button
                onClick={handleSubmitForReview}
                size="lg"
                className="w-full md:w-auto"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Enviar para Análise
              </Button>
            </div>
          )}
        </>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          Por que precisamos desses documentos?
        </h3>
        <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
          <li>Conformidade com regulamentações financeiras (BACEN)</li>
          <li>Prevenção de fraudes e lavagem de dinheiro</li>
          <li>Proteção da sua conta e transações</li>
          <li>Garantia de segurança para todos os usuários</li>
          <li>Cumprimento de requisitos legais KYC (Know Your Customer)</li>
        </ul>
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
    </div>
  );
}
