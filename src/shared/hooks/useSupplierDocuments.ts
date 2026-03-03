import { useState, useCallback } from 'react';
import { supabase } from '../services/lib/supabase';
import { SupplierDocument, DocumentUpload } from '../types/suppliers';

export const useSupplierDocuments = () => {
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar documentos de um fornecedor
  const fetchDocumentsBySupplier = useCallback(async (supplierId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_supplier_documents')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar todos os documentos com filtros
  const fetchDocuments = useCallback(async (filters?: {
    supplier_id?: string;
    document_type?: string;
    status?: 'valid' | 'expired' | 'expiring_soon';
  }) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('app_supplier_documents')
        .select(`
          *,
          app_suppliers(name, trade_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.document_type) {
        query = query.eq('document_type', filters.document_type);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let filteredData = data || [];

      // Aplicar filtro de status baseado na data de expiração
      if (filters?.status) {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        filteredData = filteredData.filter(doc => {
          if (!doc.expiry_date) return filters.status === 'valid';

          const expiryDate = new Date(doc.expiry_date);

          switch (filters.status) {
            case 'expired':
              return expiryDate < today;
            case 'expiring_soon':
              return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
            case 'valid':
              return expiryDate > thirtyDaysFromNow;
            default:
              return true;
          }
        });
      }

      setDocuments(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar documentos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload de documento
  const uploadDocument = useCallback(async (documentData: DocumentUpload & { supplier_id: string }): Promise<SupplierDocument | null> => {
    setLoading(true);
    setError(null);

    try {
      const { file, supplier_id, ...docData } = documentData;
      let filePath = '';

      // Upload do arquivo se fornecido
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        filePath = `supplier-documents/${supplier_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
      }

      // Criar registro do documento
      const { data, error } = await supabase
        .from('app_supplier_documents')
        .insert({
          supplier_id,
          ...docData,
          file_path: filePath,
          file_name: file?.name || '',
          file_size: file?.size || 0,
          mime_type: file?.type || 'application/octet-stream'
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista local se estamos visualizando documentos do mesmo fornecedor
      if (documents.length > 0 && documents[0].supplier_id === supplier_id) {
        await fetchDocumentsBySupplier(supplier_id);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload do documento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [documents, fetchDocumentsBySupplier]);

  // Atualizar documento
  const updateDocument = useCallback(async (id: string, documentData: Partial<DocumentUpload & { supplier_id: string }>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { file, supplier_id, ...docData } = documentData;
      let updateData = { ...docData };

      // Upload de novo arquivo se fornecido
      if (file && supplier_id) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `supplier-documents/${supplier_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        updateData = {
          ...updateData,
          updated_at: new Date().toISOString()
        } as any;
      }

      const { error } = await supabase
        .from('app_supplier_documents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      const currentDoc = documents.find(doc => doc.id === id);
      if (currentDoc) {
        await fetchDocumentsBySupplier(currentDoc.supplier_id);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar documento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [documents, fetchDocumentsBySupplier]);

  // Excluir documento
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Buscar documento para obter URL do arquivo
      const { data: document, error: fetchError } = await supabase
        .from('app_supplier_documents')
        .select('file_url, supplier_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Excluir arquivo do storage se existir
      if (document.file_url) {
        const filePath = document.file_url.split('/').slice(-3).join('/'); // Extrair caminho do arquivo
        await supabase.storage
          .from('documents')
          .remove([filePath]);
      }

      // Excluir registro do documento
      const { error } = await supabase
        .from('app_supplier_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista local
      await fetchDocumentsBySupplier(document.supplier_id);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir documento');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchDocumentsBySupplier]);

  // Baixar documento
  const downloadDocument = useCallback(async (document: SupplierDocument): Promise<void> => {
    try {
      if (!document.file_path) {
        throw new Error('Documento não possui arquivo anexado');
      }

      // Obter URL de download do Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      // Criar link temporário para download
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.title;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar documento');
    }
  }, []);

  // Buscar documentos próximos ao vencimento
  const fetchExpiringDocuments = useCallback(async (days: number = 30) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      const { data, error: fetchError } = await supabase
        .from('app_supplier_documents')
        .select(`
          *,
          app_suppliers(name, trade_name)
        `)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today.toISOString().split('T')[0])
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar documentos próximos ao vencimento');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    documents,
    loading,
    error,
    fetchDocumentsBySupplier,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    fetchExpiringDocuments
  };
};