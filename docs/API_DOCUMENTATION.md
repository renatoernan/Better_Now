# Better Now - Documentação da API

## Visão Geral

Este documento descreve as APIs e serviços utilizados no projeto Better Now, incluindo endpoints do Supabase, estruturas de dados e padrões de integração.

## Arquitetura da API

### Supabase Backend
- **Database**: PostgreSQL com Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage para imagens e vídeos
- **Real-time**: Subscriptions para atualizações em tempo real

### Estrutura de Dados

#### Events (Eventos)
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  location_link?: string;
  images: string[];
  videos?: string[];
  price_batches: PriceBatch[];
  event_type_id: string;
  max_participants?: number;
  current_participants: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

#### Clients (Clientes)
```typescript
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  birth_date?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

#### Testimonials (Depoimentos)
```typescript
interface Testimonial {
  id: string;
  client_name: string;
  client_email?: string;
  content: string;
  rating: number;
  event_id?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

## Endpoints da API

### Eventos

#### GET /events
Busca eventos com filtros opcionais.

**Parâmetros de Query:**
- `status`: Filtrar por status do evento
- `event_type_id`: Filtrar por tipo de evento
- `limit`: Número máximo de resultados (padrão: 10)
- `offset`: Número de registros para pular (paginação)

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Nome do Evento",
      "description": "Descrição do evento",
      "date": "2024-12-31",
      "time": "20:00",
      "location": "Local do evento",
      "images": ["url1", "url2"],
      "price_batches": [...],
      "status": "published"
    }
  ],
  "count": 25,
  "error": null
}
```

#### POST /events
Cria um novo evento.

**Body:**
```json
{
  "title": "Nome do Evento",
  "description": "Descrição detalhada",
  "date": "2024-12-31",
  "time": "20:00",
  "location": "Local do evento",
  "event_type_id": "uuid",
  "max_participants": 100
}
```

#### PUT /events/:id
Atualiza um evento existente.

#### DELETE /events/:id
Remove um evento (soft delete).

### Clientes

#### GET /clients
Lista clientes com paginação.

#### POST /clients
Registra um novo cliente.

#### PUT /clients/:id
Atualiza dados do cliente.

#### DELETE /clients/:id
Remove cliente (soft delete).

### Depoimentos

#### GET /testimonials
Lista depoimentos aprovados.

**Parâmetros:**
- `is_approved`: Filtrar por status de aprovação
- `event_id`: Filtrar por evento específico

#### POST /testimonials
Cria novo depoimento.

#### PUT /testimonials/:id
Atualiza depoimento.

#### DELETE /testimonials/:id
Remove depoimento.

## Hooks Customizados

### useSupabaseEvents
Hook para gerenciar operações com eventos.

```typescript
const {
  events,
  loading,
  error,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent
} = useSupabaseEvents();
```

**Métodos:**
- `fetchEvents(filters?)`: Busca eventos com filtros opcionais
- `createEvent(eventData)`: Cria novo evento
- `updateEvent(id, data)`: Atualiza evento
- `deleteEvent(id)`: Remove evento

### useSupabaseClients
Hook para gerenciar clientes.

```typescript
const {
  clients,
  loading,
  error,
  fetchClients,
  createClient,
  updateClient,
  deleteClient
} = useSupabaseClients();
```

### useSupabaseTestimonials
Hook para gerenciar depoimentos.

```typescript
const {
  testimonials,
  loading,
  error,
  fetchTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  approveTestimonial
} = useSupabaseTestimonials();
```

## Autenticação

### Login de Administrador
```typescript
const { signIn, signOut, user, loading } = useAuth();

// Login
await signIn(email, password);

// Logout
await signOut();
```

### Proteção de Rotas
```typescript
<ProtectedRoute>
  <AdminDashboard />
</ProtectedRoute>
```

## Validação de Dados

### Schemas Zod
Todos os formulários utilizam validação Zod:

```typescript
// Evento
const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().min(1, 'Horário é obrigatório')
});

// Cliente
const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos')
});
```

## Tratamento de Erros

### Padrão de Resposta de Erro
```typescript
interface ApiError {
  message: string;
  code?: string;
  details?: any;
}
```

### Tratamento nos Hooks
```typescript
try {
  const result = await supabase.from('events').select();
  if (result.error) throw result.error;
  return result.data;
} catch (error) {
  setError(error.message);
  toast.error('Erro ao carregar eventos');
}
```

## Cache e Performance

### Sistema de Cache Inteligente
- **TTL**: 5 minutos para dados dinâmicos
- **LRU**: Máximo de 100 entradas
- **Compressão**: Dados grandes são comprimidos
- **Invalidação**: Cache é invalidado em mutações

### Otimizações
- Lazy loading de componentes
- Paginação automática
- Debounce em buscas
- Memoização de cálculos pesados

## Real-time

### Subscriptions
```typescript
// Eventos em tempo real
const { data, error } = useRealtimeEvents();

// Notificações
const { notifications } = useRealtimeNotifications();
```

## Storage

### Upload de Imagens
```typescript
const { uploadImage, deleteImage } = useSupabaseImages();

// Upload
const imageUrl = await uploadImage(file, 'events');

// Delete
await deleteImage(imagePath);
```

### Políticas de Storage
- Imagens: Máximo 5MB, formatos JPG/PNG/WebP
- Vídeos: Máximo 50MB, formatos MP4/WebM
- Compressão automática de imagens

## Segurança

### Row Level Security (RLS)
- Eventos: Leitura pública, escrita apenas admin
- Clientes: Acesso apenas admin
- Depoimentos: Leitura pública, moderação admin

### Validação de Dados
- Sanitização de inputs
- Validação de tipos
- Prevenção de SQL injection
- Rate limiting

## Monitoramento

### Logs
- Erros são logados automaticamente
- Performance tracking
- Métricas de uso

### Health Checks
- Status da conexão com Supabase
- Verificação de permissões
- Monitoramento de storage

## Exemplos de Uso

### Criar Evento
```typescript
const eventData = {
  title: 'Festa de Ano Novo',
  description: 'Celebração especial',
  date: '2024-12-31',
  time: '22:00',
  location: 'Salão de Festas',
  event_type_id: 'uuid-tipo-festa'
};

const { createEvent } = useSupabaseEvents();
await createEvent(eventData);
```

### Buscar Eventos Filtrados
```typescript
const { fetchEvents } = useSupabaseEvents();
await fetchEvents({
  status: 'published',
  event_type_id: 'uuid-tipo',
  limit: 20
});
```

### Aprovar Depoimento
```typescript
const { approveTestimonial } = useSupabaseTestimonials();
await approveTestimonial(testimonialId);
```

## Troubleshooting

### Problemas Comuns
1. **Erro de Permissão**: Verificar políticas RLS
2. **Timeout**: Aumentar timeout nas queries
3. **Cache Stale**: Forçar refresh do cache
4. **Upload Falha**: Verificar tamanho e formato do arquivo

### Debug
```typescript
// Habilitar logs detalhados
localStorage.setItem('debug', 'supabase:*');

// Verificar status da conexão
const { data } = await supabase.from('health_check').select();
```