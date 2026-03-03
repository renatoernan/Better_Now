import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building,
  User,
  FileText,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Tag,
  Save,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSuppliers } from '../../shared/hooks/useSuppliers';
import { useSupplierCategories } from '../../shared/hooks/useSupplierCategories';
import { SupplierFormData } from '../../shared/types/suppliers';
import { toast } from 'sonner';
import Loading from '../ui/Loading';

// Schema de validação
const supplierSchema = z.object({
  // Dados básicos
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  trade_name: z.string().optional(),
  document_number: z.string().min(11, 'Documento deve ter pelo menos 11 caracteres'),
  document_type: z.enum(['CPF', 'CNPJ']),

  // Contato
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  website: z.string().url('URL inválida').optional().or(z.literal('')),

  // Endereço
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  zip_code: z.string().min(8, 'CEP deve ter 8 dígitos'),
  country: z.string().optional(),

  // Dados bancários
  bank_name: z.string().optional(),
  bank_agency: z.string().optional(),
  bank_account: z.string().optional(),
  pix_key: z.string().optional(),

  // Observações
  notes: z.string().optional(),

  // Categorias
  categories: z.array(z.string()).min(1, 'Selecione pelo menos uma categoria')
});

type FormData = z.infer<typeof supplierSchema>;

const steps = [
  { id: 1, title: 'Dados Básicos', icon: Building },
  { id: 2, title: 'Contato', icon: Phone },
  { id: 3, title: 'Endereço', icon: MapPin },
  { id: 4, title: 'Dados Bancários', icon: CreditCard },
  { id: 5, title: 'Categorias', icon: Tag },
  { id: 6, title: 'Revisão', icon: Check }
];

const AdminSupplierRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { createSupplier, loading } = useSuppliers();
  const { categories, fetchCategories } = useSupplierCategories();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid }
  } = useForm<any>({
    resolver: zodResolver(supplierSchema),
    mode: 'onChange',
    defaultValues: {
      document_type: 'CNPJ',
      country: 'Brasil',
      categories: []
    }
  });

  const watchedValues = watch();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Buscar endereço por CEP
  const fetchAddressByCEP = async (cep: string) => {
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setValue('address', data.logradouro || '');
          setValue('city', data.localidade || '');
          setValue('state', data.uf || '');
          toast.success('Endereço encontrado!');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP');
      }
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 1:
        return ['name', 'trade_name', 'document_number', 'document_type'];
      case 2:
        return ['email', 'phone', 'website'];
      case 3:
        return ['address', 'city', 'state', 'zip_code', 'country'];
      case 4:
        return ['bank_name', 'bank_agency', 'bank_account', 'pix_key'];
      case 5:
        return ['categories'];
      default:
        return [];
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const { zip_code, ...formData } = data;
      const supplierData: any = {
        ...formData,
        cep: zip_code,
        status: 'active'
      };

      await createSupplier(supplierData);
      toast.success('Fornecedor cadastrado com sucesso!');
      navigate('/admin/fornecedores');
    } catch (error) {
      console.error('Erro ao cadastrar fornecedor:', error);
      toast.error('Erro ao cadastrar fornecedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razão Social *
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="Nome completo ou razão social"
                    />
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{(errors.name as any)?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Fantasia
                </label>
                <Controller
                  name="trade_name"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome fantasia (opcional)"
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <Controller
                  name="document_type"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="CPF">CPF</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {watchedValues.document_type === 'CNPJ' ? 'CNPJ' : 'CPF'} *
                </label>
                <Controller
                  name="document_number"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.document_number ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder={watchedValues.document_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    />
                  )}
                />
                {errors.document_number && (
                  <p className="mt-1 text-sm text-red-600">{(errors.document_number as any)?.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="email@exemplo.com"
                    />
                  )}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{(errors.email as any)?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="(11) 99999-9999"
                    />
                  )}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{(errors.phone as any)?.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <Controller
                name="website"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="url"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.website ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="https://www.exemplo.com"
                  />
                )}
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">{(errors.website as any)?.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP *
                </label>
                <Controller
                  name="zip_code"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.zip_code ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="00000-000"
                      onBlur={(e) => {
                        field.onBlur();
                        const cep = e.target.value.replace(/\D/g, '');
                        if (cep.length === 8) {
                          fetchAddressByCEP(cep);
                        }
                      }}
                    />
                  )}
                />
                {errors.zip_code && (
                  <p className="mt-1 text-sm text-red-600">{(errors.zip_code as any)?.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço *
                </label>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.address ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="Rua, número, complemento"
                    />
                  )}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{(errors.address as any)?.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="Cidade"
                    />
                  )}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{(errors.city as any)?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado (UF) *
                </label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.state ? 'border-red-300' : 'border-gray-300'
                        }`}
                      placeholder="SP"
                    />
                  )}
                />
                {errors.state && (
                  <p className="mt-1 text-sm text-red-600">{(errors.state as any)?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  País *
                </label>
                <Controller
                  name="country"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brasil"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco
                </label>
                <Controller
                  name="bank_name"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do banco"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agência
                </label>
                <Controller
                  name="bank_agency"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0000"
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta
                </label>
                <Controller
                  name="bank_account"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="00000-0"
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave PIX
                </label>
                <Controller
                  name="pix_key"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="CPF, CNPJ, email ou telefone"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Categorias de Serviços *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <Controller
                    key={category.id}
                    name="categories"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.value?.includes(category.id) || false}
                          onChange={(e) => {
                            const currentValue = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...currentValue, category.id]);
                            } else {
                              field.onChange(currentValue.filter((id: string) => id !== category.id));
                            }
                          }}
                          className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                        </div>
                      </label>
                    )}
                  />
                ))}
              </div>
              {errors.categories && (
                <p className="mt-2 text-sm text-red-600">{(errors.categories as any).message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais sobre o fornecedor..."
                  />
                )}
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revisão dos Dados</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Dados Básicos</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Nome:</strong> {watchedValues.name}</p>
                    {watchedValues.trade_name && (
                      <p><strong>Nome Fantasia:</strong> {watchedValues.trade_name}</p>
                    )}
                    <p><strong>Documento:</strong> {watchedValues.document_number}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contato</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Email:</strong> {watchedValues.email}</p>
                    <p><strong>Telefone:</strong> {watchedValues.phone}</p>
                    {watchedValues.website && (
                      <p><strong>Website:</strong> {watchedValues.website}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Endereço</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>CEP:</strong> {watchedValues.zip_code}</p>
                    <p><strong>Endereço:</strong> {watchedValues.address}</p>
                    <p><strong>Cidade:</strong> {watchedValues.city} - {watchedValues.state}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Categorias</h4>
                  <div className="flex flex-wrap gap-2">
                    {watchedValues.categories.map((categoryId: string) => {
                      const category = categories.find(c => c.id === categoryId);
                      return category ? (
                        <span
                          key={categoryId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">Cadastrar Fornecedor</h1>
            <p className="text-gray-500">Preencha os dados do novo fornecedor</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : isActive
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                    {step.title}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-12 h-0.5 ml-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loading variant="spinner" size="sm" className="mr-2" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Cadastrar Fornecedor
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSupplierRegistration;