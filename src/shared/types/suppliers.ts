// Tipos TypeScript para o Sistema de Gestão de Fornecedores
// Seguindo exatamente as especificações da arquitetura técnica

// Tipos de Fornecedor
export interface Supplier {
  id: string;
  name: string;
  trade_name?: string;
  document_type: 'CPF' | 'CNPJ';
  document_number: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  
  // Endereço
  cep?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  
  // Dados bancários
  bank_name?: string;
  bank_code?: string;
  agency?: string;
  account?: string;
  account_type?: 'corrente' | 'poupanca';
  pix_key?: string;
  
  // Informações comerciais
  services_description?: string;
  specializations?: string[];
  service_area?: string[];
  min_service_value?: number;
  max_service_value?: number;
  
  // Status e controle
  status: 'active' | 'inactive' | 'blocked';
  rating: number;
  total_services: number;
  notes?: string;
  
  // Auditoria
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Tipos de Categoria
export interface SupplierCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parent_id?: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos de Relação Fornecedor-Categoria
export interface SupplierCategoryRelation {
  id: string;
  supplier_id: string;
  category_id: string;
  is_primary: boolean;
  created_at: string;
}

// Tipos de Documento
export interface SupplierDocument {
  id: string;
  supplier_id: string;
  document_type: 'contract' | 'certificate' | 'license' | 'insurance';
  title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  expiry_date?: string;
  is_required: boolean;
  status: 'valid' | 'expired' | 'pending';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Tipos de Serviço
export interface SupplierService {
  id: string;
  supplier_id: string;
  event_id?: string;
  service_date: string;
  service_type?: string;
  description?: string;
  value?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'overdue';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Tipos de Avaliação
export interface SupplierEvaluation {
  id: string;
  supplier_id: string;
  service_id?: string;
  event_id?: string;
  evaluator_name?: string;
  quality_rating: number;
  punctuality_rating: number;
  communication_rating: number;
  cost_benefit_rating: number;
  overall_rating: number;
  comments?: string;
  would_recommend: boolean;
  created_at: string;
}

// Tipos de Filtros
export interface SupplierFilters {
  categories?: string[];
  status?: string;
  city?: string;
  state?: string;
  min_rating?: number;
  has_documents?: boolean;
  service_area?: string[];
  price_range?: {
    min?: number;
    max?: number;
  };
}

// Tipos de Busca
export interface SupplierSearchParams {
  query?: string;
  filters?: SupplierFilters;
  sort_by?: 'name' | 'rating' | 'created_at' | 'total_services';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Tipos para formulários
export interface SupplierFormData {
  // Dados básicos
  name: string;
  trade_name?: string;
  document_type: 'CPF' | 'CNPJ';
  document_number: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  
  // Endereço
  cep?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  
  // Dados bancários
  bank_name?: string;
  bank_code?: string;
  agency?: string;
  account?: string;
  account_type?: 'corrente' | 'poupanca';
  pix_key?: string;
  
  // Informações comerciais
  services_description?: string;
  specializations?: string[];
  service_area?: string[];
  min_service_value?: number;
  max_service_value?: number;
  
  // Categorias
  categories?: string[];
  primary_category?: string;
  
  // Status
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
}

// Tipos para estatísticas do dashboard
export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  blocked_suppliers: number;
  total_categories: number;
  total_services: number;
  average_rating: number;
  suppliers_by_category: {
    category_name: string;
    category_color: string;
    count: number;
  }[];
  recent_suppliers: Supplier[];
  top_rated_suppliers: Supplier[];
  expiring_documents: {
    supplier_name: string;
    document_title: string;
    expiry_date: string;
    days_until_expiry: number;
  }[];
}

// Tipos para relatórios
export interface SupplierReport {
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_suppliers: number;
    new_suppliers: number;
    total_services: number;
    total_value: number;
    average_rating: number;
  };
  by_category: {
    category_name: string;
    suppliers_count: number;
    services_count: number;
    total_value: number;
    average_rating: number;
  }[];
  by_location: {
    city: string;
    state: string;
    suppliers_count: number;
    services_count: number;
  }[];
  top_performers: {
    supplier_name: string;
    rating: number;
    services_count: number;
    total_value: number;
  }[];
}

// Tipos para componentes com dados relacionados
export interface SupplierWithCategories extends Supplier {
  supplier_category_relations: {
    supplier_categories: SupplierCategory;
    is_primary: boolean;
  }[];
}

export interface SupplierWithDetails extends Supplier {
  supplier_category_relations: {
    supplier_categories: SupplierCategory;
    is_primary: boolean;
  }[];
  supplier_documents: SupplierDocument[];
  supplier_services: (SupplierService & {
    events?: {
      name: string;
      event_date: string;
    };
  })[];
  supplier_evaluations: SupplierEvaluation[];
}

// Tipos para validação de formulários
export interface SupplierValidationErrors {
  name?: string;
  document_type?: string;
  document_number?: string;
  email?: string;
  phone?: string;
  cep?: string;
  bank_name?: string;
  agency?: string;
  account?: string;
  categories?: string;
  min_service_value?: string;
  max_service_value?: string;
}

// Tipos para ações de API
export type SupplierAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'block'
  | 'unblock';

// Tipos para status de loading
export interface SupplierLoadingState {
  suppliers: boolean;
  categories: boolean;
  documents: boolean;
  services: boolean;
  evaluations: boolean;
  stats: boolean;
}

// Tipos para erros
export interface SupplierError {
  message: string;
  code?: string;
  field?: string;
}

// Tipos para paginação
export interface SupplierPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Tipos para resposta da API
export interface SupplierApiResponse<T> {
  data: T;
  pagination?: SupplierPagination;
  error?: SupplierError;
}

// Tipos para upload de documentos
export interface DocumentUpload {
  file: File;
  document_type: 'contract' | 'certificate' | 'license' | 'insurance';
  title: string;
  expiry_date?: string;
  is_required: boolean;
  notes?: string;
}

// Tipos para avaliação de fornecedor
export interface EvaluationFormData {
  supplier_id: string;
  service_id?: string;
  event_id?: string;
  evaluator_name?: string;
  quality_rating: number;
  punctuality_rating: number;
  communication_rating: number;
  cost_benefit_rating: number;
  comments?: string;
  would_recommend: boolean;
}

// Tipos para configuração de categorias
export interface CategoryFormData {
  name: string;
  description?: string;
  color: string;
  icon: string;
  parent_id?: string;
  sort_order: number;
  active: boolean;
}

// Tipos para histórico de serviços
export interface ServiceFormData {
  supplier_id: string;
  event_id?: string;
  service_date: string;
  service_type?: string;
  description?: string;
  value?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

// Tipos para notificações
export interface SupplierNotification {
  id: string;
  type: 'document_expiring' | 'new_evaluation' | 'service_completed' | 'payment_overdue';
  title: string;
  message: string;
  supplier_id?: string;
  document_id?: string;
  service_id?: string;
  created_at: string;
  read: boolean;
}

// Tipos para configurações do sistema
export interface SupplierSystemConfig {
  document_expiry_warning_days: number;
  auto_calculate_rating: boolean;
  require_document_validation: boolean;
  enable_notifications: boolean;
  default_service_status: string;
  default_payment_status: string;
}