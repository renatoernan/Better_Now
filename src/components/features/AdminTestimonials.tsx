import React, { useEffect, useState, Suspense } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Star, 
  StarOff, 
  Trash2, 
  Eye,
  Calendar,
  User,
  Phone,
  Tag,
  RefreshCw,
  Edit,
  RotateCcw,
  Trash
} from 'lucide-react';
import { useSupabaseTestimonials } from '../../shared/hooks/hooks/useSupabaseTestimonials';
import { useLanguage } from '../../shared/contexts/contexts/LanguageContext';
import Loading from '../ui/Loading';
import type { Testimonial } from '../../shared/hooks/hooks/useSupabaseTestimonials';

// Lazy load modals
const TestimonialEditModal = React.lazy(() => import('../shared/TestimonialEditModal'));
const TestimonialConfirmModal = React.lazy(() => import('../shared/TestimonialConfirmModal'));

const AdminTestimonials: React.FC = () => {
  const {
    testimonials,
    pendingTestimonials,
    deletedTestimonials,
    loading,
    fetchAllTestimonials,
    fetchDeletedTestimonials,
    approveTestimonial,
    rejectTestimonial,
    deleteTestimonial,
    restoreTestimonial,
    permanentDeleteTestimonial,
    toggleFeatured
  } = useSupabaseTestimonials();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all' | 'trash'>('pending');
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [testimonialToEdit, setTestimonialToEdit] = useState<Testimonial | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'soft_delete' | 'restore' | 'hard_delete';
    testimonialId: string;
    testimonialName: string;
  }>({ isOpen: false, type: 'soft_delete', testimonialId: '', testimonialName: '' });

  useEffect(() => {
    fetchAllTestimonials();
    fetchDeletedTestimonials();
  }, []);

  const getFilteredTestimonials = () => {
    switch (activeTab) {
      case 'pending':
        return testimonials.filter(t => t.status === 'pending');
      case 'approved':
        return testimonials.filter(t => t.status === 'approved');
      case 'rejected':
        return testimonials.filter(t => t.status === 'rejected');
      case 'trash':
        return deletedTestimonials;
      default:
        return testimonials;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Aprovado' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejeitado' }
    };
    
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setShowModal(true);
  };

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setTestimonialToEdit(testimonial);
    setIsEditModalOpen(true);
  };

  const handleApprove = async (id: string, isFeatured: boolean = false) => {
    await approveTestimonial(id, isFeatured);
    setShowModal(false);
  };

  const handleReject = async (id: string) => {
    await rejectTestimonial(id);
    setShowModal(false);
  };

  const handleSoftDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'soft_delete',
      testimonialId: id,
      testimonialName: name
    });
  };

  const handleRestore = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'restore',
      testimonialId: id,
      testimonialName: name
    });
  };

  const handleHardDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'hard_delete',
      testimonialId: id,
      testimonialName: name
    });
  };

  const handleConfirmAction = async () => {
    const { type, testimonialId } = confirmModal;
    
    try {
      switch (type) {
        case 'soft_delete':
          await deleteTestimonial(testimonialId);
          break;
        case 'restore':
          await restoreTestimonial(testimonialId);
          break;
        case 'hard_delete':
          await permanentDeleteTestimonial(testimonialId);
          break;
      }
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    }
  };

  const filteredTestimonials = getFilteredTestimonials();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Gerenciar Depoimentos
          </h1>
          <p className="text-gray-600 mt-1">
            Modere e gerencie os depoimentos dos clientes
          </p>
        </div>
        
        <button
          onClick={() => {
            fetchAllTestimonials();
            fetchDeletedTestimonials();
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {testimonials.filter(t => t.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprovados</p>
              <p className="text-2xl font-bold text-green-600">
                {testimonials.filter(t => t.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejeitados</p>
              <p className="text-2xl font-bold text-red-600">
                {testimonials.filter(t => t.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lixeira</p>
              <p className="text-2xl font-bold text-gray-600">{deletedTestimonials.length}</p>
            </div>
            <Trash className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'pending', label: 'Pendentes', count: testimonials.filter(t => t.status === 'pending').length },
              { key: 'approved', label: 'Aprovados', count: testimonials.filter(t => t.status === 'approved').length },
              { key: 'rejected', label: 'Rejeitados', count: testimonials.filter(t => t.status === 'rejected').length },
              { key: 'all', label: 'Todos', count: testimonials.length },
              { key: 'trash', label: 'Lixeira', count: deletedTestimonials.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTestimonials.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum depoimento encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTestimonials.map((testimonial) => (
                <div key={testimonial.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
                        {getStatusBadge(testimonial.status)}
                        {testimonial.is_featured && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3" />
                            Destaque
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {testimonial.whatsapp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          {testimonial.event_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(testimonial.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 line-clamp-2">
                        "{testimonial.testimonial_text}"
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleViewDetails(testimonial)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {activeTab !== 'trash' ? (
                        <>
                          <button
                            onClick={() => handleEditTestimonial(testimonial)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {testimonial.status === 'approved' && (
                            <button
                              onClick={() => toggleFeatured(testimonial.id, !testimonial.is_featured)}
                              className={`p-2 rounded-lg transition-colors ${
                                testimonial.is_featured
                                  ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                                  : 'text-gray-600 hover:text-yellow-600 hover:bg-yellow-50'
                              }`}
                              title={testimonial.is_featured ? 'Remover destaque' : 'Destacar'}
                            >
                              {testimonial.is_featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleSoftDelete(testimonial.id, testimonial.name)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Mover para lixeira"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestore(testimonial.id, testimonial.name)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restaurar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleHardDelete(testimonial.id, testimonial.name)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir permanentemente"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
              )}
            </div>
      </div>

      {/* Modal de edição */}
      {isEditModalOpen && testimonialToEdit && (
        <Suspense fallback={<Loading message="Carregando modal de edição..." />}>
          <TestimonialEditModal
            testimonial={testimonialToEdit}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setTestimonialToEdit(null);
            }}
            onSave={() => {
              fetchAllTestimonials();
              setIsEditModalOpen(false);
              setTestimonialToEdit(null);
            }}
          />
        </Suspense>
      )}

      {/* Modal de detalhes */}
      {showModal && selectedTestimonial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Detalhes do Depoimento</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <p className="text-gray-900">{selectedTestimonial.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <p className="text-gray-900">{selectedTestimonial.whatsapp}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                  <p className="text-gray-900">{selectedTestimonial.event_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div>{getStatusBadge(selectedTestimonial.status)}</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depoimento</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">"{selectedTestimonial.testimonial_text}"</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <label className="block font-medium mb-1">Criado em</label>
                  <p>{formatDate(selectedTestimonial.created_at)}</p>
                </div>
                {selectedTestimonial.approved_at && (
                  <div>
                    <label className="block font-medium mb-1">Aprovado em</label>
                    <p>{formatDate(selectedTestimonial.approved_at)}</p>
                  </div>
                )}
              </div>
            </div>
            
            {selectedTestimonial.status === 'pending' && (
              <div className="flex gap-4 p-6 border-t border-gray-200">
                <button
                  onClick={() => handleReject(selectedTestimonial.id)}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
                <button
                  onClick={() => handleApprove(selectedTestimonial.id, false)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={() => handleApprove(selectedTestimonial.id, true)}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Aprovar e Destacar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      <Suspense fallback={null}>
        <TestimonialConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={handleConfirmAction}
          type={confirmModal.type}
          testimonialName={confirmModal.testimonialName}
        />
      </Suspense>
    </div>
  );
};

export default AdminTestimonials;