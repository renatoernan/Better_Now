# Better Now - Documentação de Arquitetura

## Visão Geral da Arquitetura

O Better Now é construído seguindo uma arquitetura moderna e escalável, baseada em princípios de Clean Architecture e Domain-Driven Design (DDD), adaptados para o ecossistema React.

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Pages     │  │ Components  │  │    UI Library       │ │
│  │             │  │             │  │                     │ │
│  │ • Public    │  │ • Forms     │  │ • Button            │ │
│  │ • Admin     │  │ • Features  │  │ • Input             │ │
│  │ • Auth      │  │ • Layout    │  │ • Modal             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Hooks     │  │  Contexts   │  │     Schemas         │ │
│  │             │  │             │  │                     │ │
│  │ • Business  │  │ • Auth      │  │ • Validation        │ │
│  │ • Data      │  │ • Theme     │  │ • Types             │ │
│  │ • UI State  │  │ • Settings  │  │ • Transformers      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Supabase   │  │   Cache     │  │     Utils           │ │
│  │             │  │             │  │                     │ │
│  │ • Database  │  │ • Memory    │  │ • Formatters        │ │
│  │ • Auth      │  │ • Storage   │  │ • Validators        │ │
│  │ • Storage   │  │ • TTL/LRU   │  │ • Helpers           │ │
│  │ • Realtime  │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Padrões Arquiteturais

### 1. Component-Based Architecture

#### Hierarquia de Componentes
```
App
├── Router
│   ├── PublicRoutes
│   │   ├── HomePage
│   │   ├── EventsPage
│   │   ├── AboutPage
│   │   └── ContactPage
│   └── ProtectedRoutes
│       ├── AdminDashboard
│       ├── EventManagement
│       ├── ClientManagement
│       └── TestimonialManagement
```

#### Composição de Componentes
```typescript
// Exemplo de composição
<EventCard>
  <EventCard.Header>
    <EventCard.Title />
    <EventCard.Status />
  </EventCard.Header>
  <EventCard.Body>
    <EventCard.Description />
    <EventCard.Details />
  </EventCard.Body>
  <EventCard.Footer>
    <EventCard.Actions />
  </EventCard.Footer>
</EventCard>
```

### 2. Custom Hooks Pattern

#### Separação de Responsabilidades
```typescript
// Data Hooks - Gerenciam estado de dados
useSupabaseEvents()
useSupabaseClients()
useSupabaseTestimonials()

// Business Logic Hooks - Encapsulam regras de negócio
useDashboardData()
useClientInteractions()
useEventValidation()

// UI State Hooks - Gerenciam estado da interface
usePagination()
useModal()
useToast()
```

#### Exemplo de Hook Customizado
```typescript
export function useSupabaseEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (filters?: EventFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .match(filters || {});
        
      if (error) throw error;
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, fetchEvents };
}
```

### 3. Context Pattern

#### Estrutura de Contextos
```typescript
// AuthContext - Gerencia autenticação
interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

// ThemeContext - Gerencia tema da aplicação
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// SettingsContext - Gerencia configurações globais
interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}
```

## Fluxo de Dados

### 1. Unidirecional Data Flow

```
User Action → Component → Hook → Supabase → Hook → Component → UI Update
```

### 2. Estado Global vs Local

#### Estado Global (Context)
- Autenticação do usuário
- Configurações da aplicação
- Tema da interface
- Dados compartilhados entre rotas

#### Estado Local (useState/useReducer)
- Estado de formulários
- Estado de componentes específicos
- Dados temporários
- Estados de UI (loading, error)

### 3. Cache Strategy

```typescript
// Sistema de Cache Inteligente
class IntelligentCache {
  private cache = new Map();
  private ttl = new Map();
  private maxSize = 100;

  set(key: string, value: any, ttlMs = 300000) { // 5 min default
    // Implementa LRU + TTL
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  get(key: string) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
}
```

## Estrutura de Pastas Detalhada

### Organização por Feature

```
src/
├── components/
│   ├── ui/                 # Componentes base reutilizáveis
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── forms/              # Componentes de formulário
│   │   ├── ContactForm/
│   │   ├── EventForm/
│   │   └── ClientForm/
│   ├── layout/             # Componentes de layout
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   └── features/           # Componentes específicos
│       ├── EventCard/
│       ├── ClientCard/
│       └── TestimonialCard/
├── pages/
│   ├── public/             # Páginas públicas
│   │   ├── HomePage/
│   │   ├── EventsPage/
│   │   └── ContactPage/
│   └── admin/              # Páginas administrativas
│       ├── Dashboard/
│       ├── EventManagement/
│       └── ClientManagement/
├── shared/
│   ├── hooks/              # Custom hooks
│   │   ├── data/           # Hooks de dados
│   │   ├── business/       # Hooks de lógica de negócio
│   │   └── ui/             # Hooks de UI
│   ├── contexts/           # Contextos React
│   ├── types/              # Definições TypeScript
│   ├── schemas/            # Schemas Zod
│   ├── utils/              # Utilitários
│   └── constants/          # Constantes da aplicação
```

## Padrões de Código

### 1. Naming Conventions

```typescript
// Componentes: PascalCase
export const EventCard: React.FC<EventCardProps> = ({ event }) => {};

// Hooks: camelCase com prefixo 'use'
export const useSupabaseEvents = () => {};

// Tipos: PascalCase com sufixo apropriado
interface EventCardProps {}
type EventStatus = 'draft' | 'published' | 'cancelled';

// Constantes: SCREAMING_SNAKE_CASE
export const API_ENDPOINTS = {
  EVENTS: '/events',
  CLIENTS: '/clients'
};

// Funções utilitárias: camelCase
export const formatDate = (date: string) => {};
```

### 2. File Organization

```typescript
// index.ts - Barrel exports
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';

// Component file structure
import React from 'react';
import { ComponentProps } from './types';
import { useComponentLogic } from './hooks';
import './styles.css';

export const Component: React.FC<ComponentProps> = (props) => {
  const logic = useComponentLogic(props);
  
  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
};
```

### 3. Error Handling

```typescript
// Error Boundary Pattern
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

// Hook Error Handling
export const useSupabaseEvents = () => {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: Error) => {
    setError(err.message);
    toast.error('Erro ao carregar eventos');
    console.error('Events error:', err);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      // ... fetch logic
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);
};
```

## Performance Optimization

### 1. Code Splitting

```typescript
// Route-based splitting
const HomePage = lazy(() => import('../pages/public/HomePage'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));

// Component-based splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Conditional splitting
const AdminPanel = lazy(() => 
  import('./AdminPanel').then(module => ({ 
    default: module.AdminPanel 
  }))
);
```

### 2. Memoization Strategy

```typescript
// Component memoization
export const EventCard = React.memo<EventCardProps>(({ event, onEdit }) => {
  const handleEdit = useCallback(() => onEdit(event), [event, onEdit]);
  
  return (
    <Card>
      <h3>{event.title}</h3>
      <Button onClick={handleEdit}>Editar</Button>
    </Card>
  );
});

// Value memoization
export const useEventStats = (events: Event[]) => {
  const stats = useMemo(() => ({
    total: events.length,
    published: events.filter(e => e.status === 'published').length,
    draft: events.filter(e => e.status === 'draft').length
  }), [events]);

  return stats;
};
```

### 3. Virtual Scrolling

```typescript
// Para listas grandes
export const VirtualEventList: React.FC<{ events: Event[] }> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { visibleItems, scrollElementProps } = useVirtualScroll({
    items: events,
    itemHeight: 120,
    containerHeight: 600,
    overscan: 5
  });

  return (
    <div ref={containerRef} {...scrollElementProps}>
      {visibleItems.map(({ item, index }) => (
        <EventCard key={item.id} event={item} />
      ))}
    </div>
  );
};
```

## Security Architecture

### 1. Authentication Flow

```
User Login → Supabase Auth → JWT Token → Row Level Security → Data Access
```

### 2. Authorization Patterns

```typescript
// Role-based access control
export const usePermissions = () => {
  const { user } = useAuth();
  
  return {
    canCreateEvent: user?.role === 'admin',
    canEditEvent: (event: Event) => 
      user?.role === 'admin' || event.created_by === user?.id,
    canDeleteEvent: user?.role === 'admin'
  };
};

// Component-level protection
export const ProtectedComponent: React.FC = ({ children }) => {
  const { canAccess } = usePermissions();
  
  if (!canAccess) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
};
```

### 3. Data Validation

```typescript
// Schema-based validation
export const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(10, 'Descrição muito curta'),
  date: z.string().refine(isValidDate, 'Data inválida'),
  price: z.number().positive('Preço deve ser positivo')
});

// Runtime validation
export const validateEventData = (data: unknown): Event => {
  try {
    return eventSchema.parse(data);
  } catch (error) {
    throw new ValidationError('Dados do evento inválidos', error);
  }
};
```

## Testing Architecture

### 1. Testing Pyramid

```
E2E Tests (Cypress)
    ↑
Integration Tests (React Testing Library)
    ↑
Unit Tests (Jest)
```

### 2. Test Organization

```
src/
├── components/
│   └── ui/
│       └── Button/
│           ├── Button.tsx
│           ├── Button.test.tsx      # Unit tests
│           └── Button.stories.tsx   # Storybook stories
├── shared/
│   └── hooks/
│       └── __tests__/
│           └── useSupabaseEvents.test.ts
└── test/
    ├── setup.ts                     # Test configuration
    ├── mocks/                       # Test mocks
    ├── fixtures/                    # Test data
    └── utils/                       # Test utilities
```

### 3. Testing Patterns

```typescript
// Component testing
describe('EventCard', () => {
  const mockEvent = createMockEvent();
  
  it('renders event information correctly', () => {
    render(<EventCard event={mockEvent} />);
    
    expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
    expect(screen.getByText(mockEvent.description)).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<EventCard event={mockEvent} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(mockEvent);
  });
});

// Hook testing
describe('useSupabaseEvents', () => {
  it('fetches events successfully', async () => {
    const { result } = renderHook(() => useSupabaseEvents());
    
    await act(async () => {
      await result.current.fetchEvents();
    });
    
    expect(result.current.events).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });
});
```

## Deployment Architecture

### 1. Build Process

```
Source Code → TypeScript Compilation → Bundling (Vite) → Optimization → Static Assets
```

### 2. Environment Configuration

```typescript
// Environment-specific configs
export const config = {
  development: {
    supabaseUrl: process.env.VITE_SUPABASE_URL_DEV,
    logLevel: 'debug',
    enableDevTools: true
  },
  production: {
    supabaseUrl: process.env.VITE_SUPABASE_URL_PROD,
    logLevel: 'error',
    enableDevTools: false
  }
};
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test:ci
      - name: Build
        run: pnpm build
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod
```

## Monitoring & Observability

### 1. Error Tracking

```typescript
// Error reporting
export const reportError = (error: Error, context?: any) => {
  console.error('Application error:', error, context);
  
  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    errorTrackingService.captureException(error, { extra: context });
  }
};
```

### 2. Performance Monitoring

```typescript
// Performance tracking
export const trackPerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  console.log(`${name} took ${end - start} milliseconds`);
  
  // Send metrics
  analytics.track('performance', {
    operation: name,
    duration: end - start
  });
};
```

## Conclusão

Esta arquitetura foi projetada para ser:

- **Escalável**: Suporta crescimento da aplicação
- **Manutenível**: Código organizado e testável
- **Performante**: Otimizações em múltiplas camadas
- **Segura**: Múltiplas camadas de segurança
- **Testável**: Cobertura abrangente de testes
- **Observável**: Monitoramento e debugging eficazes

A arquitetura evolui continuamente com as necessidades do projeto, mantendo sempre os princípios de qualidade e boas práticas de desenvolvimento.