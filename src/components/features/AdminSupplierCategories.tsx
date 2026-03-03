import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  Users,
  ArrowLeft,
  Palette,
  Save,
  X,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSupplierCategories } from '../../shared/hooks/useSupplierCategories';
import { SupplierCategory, CategoryFormData } from '../../shared/types/suppliers';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  color: z.string().min(1, 'Cor é obrigatória').regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  active: z.boolean().default(true)
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const predefinedColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#F43F5E', '#8B5A2B', '#6B7280', '#1F2937'
];

const AdminSupplierCategories: React.FC = () => {
  const navigate = useNavigate();
  const {
    categories,
    categoriesWithCounts,
    loading,
    fetchCategories,
    fetchCategoriesWithCounts,
    createCategory,
    updateCategory,
    deleteCategory
  } = useSupplierCategories() as any;

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SupplierCategory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<any>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: predefinedColors[0],
      active: true
    }
  });

  const selectedColor = watch('color');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchCategories(),
        fetchCategoriesWithCounts()
      ]);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    }
  };

  const filteredCategories = categoriesWithCounts.filter((category: any) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (category?: SupplierCategory) => {
    if (category) {
      setEditingCategory(category);
      reset({
        name: category.name,
        description: category.description || '',
        color: category.color,
        active: category.active
      });
    } else {
      setEditingCategory(null);
      reset({
        name: '',
        description: '',
        color: predefinedColors[0],
        active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      const formData: CategoryFormData = {
        name: data.name,
        description: data.description || null,
        color: data.color,
        icon: 'tag', // Valor padrão para evitar erro de tipo
        sort_order: 0, // Valor padrão
        active: data.active
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await createCategory(formData);
        toast.success('Categoria criada com sucesso!');
      }

      handleCloseModal();
      await loadData();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory(categoryId);
      toast.success('Categoria excluída com sucesso!');
      setShowDeleteConfirm(null);
      await loadData();
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error);
      if (error.message?.includes('possui fornecedores')) {
        toast.error('Não é possível excluir esta categoria pois ela possui fornecedores associados');
      } else {
        toast.error('Erro ao excluir categoria');
      }
    }
  };

  const generateRandomColor = () => {
    const randomColor = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
    setValue('color', randomColor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading variant="pulse" size="lg" text="Carregando categorias..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/fornecedores')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias de Fornecedores</h1>
            <p className="text-gray-500">Gerencie as categorias para organizar seus fornecedores</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Categorias</p>
              <p className="text-2xl font-bold text-gray-900">{categoriesWithCounts.length}</p>
            </div>
            <Tag className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categorias Ativas</p>
              <p className="text-2xl font-bold text-green-600">
                {categoriesWithCounts.filter((c: any) => c.active).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fornecedores Categorizados</p>
              <p className="text-2xl font-bold text-purple-600">
                {categoriesWithCounts.reduce((sum, c) => sum + (c.supplier_count || 0), 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar categorias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div
              className="h-3"
              style={{ backgroundColor: category.color }}
            />

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    {!category.active && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                        Inativa
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-1">
                  <button
                    onClick={() => handleOpenModal(category)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar categoria"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(category.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Excluir categoria"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {category.description && (
                <p className="text-sm text-gray-600 mb-4">{category.description}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-500">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{category.supplier_count || 0} fornecedor{(category.supplier_count || 0) !== 1 ? 'es' : ''}</span>
                </div>

                <div className="text-xs text-gray-400">
                  Criada em {new Date(category.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? 'Tente ajustar os termos de busca'
              : 'Crie categorias para organizar seus fornecedores'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar primeira categoria
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Decoração, Catering, Fotografia..."
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{(errors.name as any)?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrição opcional da categoria..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{(errors.description as any)?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor da Categoria *
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    {...register('color')}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    {...register('color')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="#3B82F6"
                  />
                  <button
                    type="button"
                    onClick={generateRandomColor}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Cor aleatória"
                  >
                    <Palette className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('color', color)}
                      className={`w-6 h-6 rounded border-2 ${selectedColor === color ? 'border-gray-400' : 'border-gray-200'
                        }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {errors.color && (
                  <p className="mt-1 text-sm text-red-600">{(errors.color as any)?.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('active')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Categoria ativa
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loading variant="spinner" size="sm" className="mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingCategory ? 'Atualizar' : 'Criar'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupplierCategories;