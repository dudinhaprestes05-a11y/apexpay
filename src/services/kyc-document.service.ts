import { api } from '../lib/api';
import { KYCDocument, KYCDocumentType } from '../types';

export class KYCDocumentService {
  static async uploadDocument(
    userId: string,
    documentType: KYCDocumentType,
    file: File
  ): Promise<{ success: boolean; error?: string; document?: KYCDocument }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      const { data: document, error: dbError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: userId,
          document_type: documentType,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return { success: true, document };
    } catch (error: any) {
      console.error('Error uploading document:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDocuments(userId: string): Promise<KYCDocument[]> {
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  static async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const { data: doc } = await supabase
        .from('kyc_documents')
        .select('file_url, status')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (!doc || doc.status !== 'pending') {
        return false;
      }

      const fileName = doc.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('kyc-documents')
          .remove([`${userId}/${fileName}`]);
      }

      const { error } = await supabase
        .from('kyc_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  static async getDocumentsByType(
    userId: string,
    documentType: KYCDocumentType
  ): Promise<KYCDocument | null> {
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('document_type', documentType)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document by type:', error);
      return null;
    }
  }

  static async updateDocumentStatus(
    documentId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', documentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating document status:', error);
      return false;
    }
  }

  static getRequiredDocuments(documentType: 'cpf' | 'cnpj'): {
    type: KYCDocumentType;
    label: string;
    description: string;
  }[] {
    const cpfDocuments = [
      {
        type: 'rg_frente' as KYCDocumentType,
        label: 'RG - Frente',
        description: 'Foto nítida da frente do RG',
      },
      {
        type: 'rg_verso' as KYCDocumentType,
        label: 'RG - Verso',
        description: 'Foto nítida do verso do RG',
      },
      {
        type: 'selfie_com_rg' as KYCDocumentType,
        label: 'Selfie com RG',
        description: 'Foto segurando o RG ao lado do rosto',
      },
      {
        type: 'comprovante_endereco' as KYCDocumentType,
        label: 'Comprovante de Endereço',
        description: 'Conta de luz, água ou telefone dos últimos 3 meses',
      },
    ];

    const cnpjDocuments = [
      {
        type: 'contrato_social' as KYCDocumentType,
        label: 'Contrato Social',
        description: 'Contrato social da empresa atualizado',
      },
      {
        type: 'rg_frente' as KYCDocumentType,
        label: 'RG Responsável - Frente',
        description: 'RG do responsável legal - frente',
      },
      {
        type: 'rg_verso' as KYCDocumentType,
        label: 'RG Responsável - Verso',
        description: 'RG do responsável legal - verso',
      },
      {
        type: 'selfie_com_rg' as KYCDocumentType,
        label: 'Selfie Responsável com RG',
        description: 'Responsável legal segurando o RG',
      },
      {
        type: 'comprovante_endereco' as KYCDocumentType,
        label: 'Comprovante de Endereço da Empresa',
        description: 'Conta no nome da empresa dos últimos 3 meses',
      },
    ];

    return documentType === 'cpf' ? cpfDocuments : cnpjDocuments;
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (file.size > maxSize) {
      return { valid: false, error: 'Arquivo muito grande. Máximo 5MB.' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de arquivo não permitido. Use JPG, PNG ou PDF.' };
    }

    return { valid: true };
  }
}
