import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  X,
  Save,
  Edit
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupplierDocuments } from '../../shared/hooks/useSupplierDocuments';
import { useSuppliers } from '../../shared/hooks/useSuppliers';
import { SupplierDocument, DocumentUpload } from '../../shared/types/suppliers';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

const documentSchema = z.object({
  supplier_id: z.string().min(1, 'Fornecedor é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  type: z.string().min(1, 'Tipo de documento é obrigatório'),
  expiry_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  notes: z.string().optional(),
  file: z.any().optional()
});

type DocumentFormValues = z.infer<typeof documentSchema>;

const documentTypes: { value: string; label: string }[] = [
  { value: 'contract', label: 'Contrato' },
  { value: 'certificate', label: 'Certificado' },
  { value: 'license', label: 'Licença' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'tax_document', label: 'Documento Fiscal' },
  { value: 'other', label: 'Outro' }
];

const AdminSupplierDocuments: React.FC = () => {
  const navigate = useNavigate();
  const {
    documents,
    loading,
    fetchDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument
  } = useSupplierDocuments();

  const { suppliers, fetchSuppliers } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<SupplierDocument | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema)
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchDocuments(),
        fetchSuppliers()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar documentos');
    }
  };

  const getDocumentStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'valid';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expiring':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Válido';
      case 'expiring':
        return 'Vence em breve';
      case 'expired':
        return 'Vencido';
      default:
        return 'Desconhecido';
    }
  };

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (document.notes && document.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const status = getDocumentStatus(document.expiry_date);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    const matchesType = typeFilter === 'all' || (document as any).type === typeFilter;

    const matchesSupplier = supplierFilter === 'all' || document.supplier_id === supplierFilter;

    return matchesSearch && matchesStatus && matchesType && matchesSupplier;
  });

  const documentStats = {
    total: documents.length,
    valid: documents.filter(d => getDocumentStatus(d.expiry_date) === 'valid').length,
    expiring: documents.filter(d => getDocumentStatus(d.expiry_date) === 'expiring').length,
    expired: documents.filter(d => getDocumentStatus(d.expiry_date) === 'expired').length
  };

  const handleOpenModal = (document?: SupplierDocument) => {
    if (document) {
      setEditingDocument(document);
      reset({
        supplier_id: document.supplier_id,
        title: document.title,
        type: (document as any).type,
        expiry_date: document.expiry_date,
        notes: document.notes || ''
      });
    } else {
      setEditingDocument(null);
      reset({
        supplier_id: '',
        title: '',
        type: 'certificate',
        expiry_date: '',
        notes: ''
      });
    }
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDocument(null);
    setSelectedFile(null);
    reset();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!watch('title')) {
        setValue('title', file.name);
      }
    }
  };

  const onSubmit = async (data: DocumentFormValues) => {
    try {
      setIsUploading(true);

      if (editingDocument) {
        const updateData: any = {
          title: data.title,
          document_type: data.type,
          expiry_date: data.expiry_date,
          notes: data.notes || null
        };

        if (selectedFile) {
          updateData.file = selectedFile;
        }

        await updateDocument(editingDocument.id, updateData as DocumentUpload);
        toast.success('Documento atualizado com sucesso!');
      } else {
        if (!selectedFile) {
          toast.error('Selecione um arquivo para upload');
          return;
        }

        const uploadData = {
          supplier_id: data.supplier_id,
          title: data.title,
          type: data.type,
          expiry_date: data.expiry_date,
          notes: data.notes || null,
          file: selectedFile
        };

        await uploadDocument(uploadData as any);
        toast.success('Documento enviado com sucesso!');
      }

      handleCloseModal();
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      toast.error('Erro ao salvar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      toast.success('Documento excluído com sucesso!');
      setShowDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast.error('Erro ao excluir documento');
    }
  };

  const handleDownload = (document: SupplierDocument) => {
    // Implementar download via URL ou Buffer se necessário
    console.log('Download document:', document);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading variant="pulse" size="lg" text="Carregando documentos..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/fornecedores')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biblioteca de Documentos</h1>
            <p className="text-gray-500">Gerencie todos os documentos dos fornecedores</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{documentStats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600 text-green-600">Válidos</p>
          <p className="text-2xl font-bold text-green-600">{documentStats.valid}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600 text-yellow-600">Vencendo</p>
          <p className="text-2xl font-bold text-yellow-600">{documentStats.expiring}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm font-medium text-gray-600 text-red-600">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{documentStats.expired}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="valid">Válidos</option>
            <option value="expiring">Vencendo</option>
            <option value="expired">Vencidos</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os fornecedores</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDocuments.map((document) => {
              const supplier = suppliers.find(s => s.id === document.supplier_id);
              const status = getDocumentStatus(document.expiry_date);
              const typeLabel = (documentTypes.find(t => t.value === (document as any).type) as any)?.label || (document as any).type;

              return (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{document.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeLabel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(document.expiry_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handleDownload(document)} title="Download"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleOpenModal(document)} title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => setShowDeleteConfirm(document.id)} title="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between">
              <h2 className="text-lg font-semibold">{editingDocument ? 'Editar Documento' : 'Novo Documento'}</h2>
              <button onClick={handleCloseModal}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Fornecedor *</label>
                  <select {...register('supplier_id')} className="w-full border rounded p-2">
                    <option value="">Selecione...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Tipo *</label>
                  <select {...register('type')} className="w-full border rounded p-2">
                    {documentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Título *</label>
                <input {...register('title')} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Vencimento *</label>
                <input type="date" {...register('expiry_date')} className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Arquivo</label>
                <input type="file" onChange={handleFileChange} className="w-full border rounded p-2" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  {isUploading ? 'Enviando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupplierDocuments;