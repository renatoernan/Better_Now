# Documentação de Componentes - Better Now

## Visão Geral

Este documento descreve os componentes principais do sistema Better Now, suas props, uso e exemplos práticos.

## Componentes UI Base

### Button

Componente de botão reutilizável com múltiplas variantes e estados.

#### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}
```

#### Uso

```tsx
import { Button } from '@/components/ui/Button';

// Botão padrão
<Button>Clique aqui</Button>

// Botão com variante
<Button variant="destructive">Excluir</Button>

// Botão com loading
<Button loading>Salvando...</Button>

// Botão como link
<Button variant="link" asChild>
  <a href="/home">Ir para Home</a>
</Button>
```

#### Variantes

- **default**: Botão primário azul
- **destructive**: Botão vermelho para ações destrutivas
- **outline**: Botão com borda
- **secondary**: Botão secundário cinza
- **ghost**: Botão transparente
- **link**: Estilo de link

### Modal

Componente de modal responsivo com overlay e animações.

#### Props

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}
```

#### Uso

```tsx
import { Modal } from '@/components/ui/Modal';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Criar Evento"
  size="lg"
>
  <EventForm onSubmit={handleSubmit} />
</Modal>
```

#### Características

- Overlay com blur
- Animações suaves de entrada/saída
- Fechamento por ESC ou clique no overlay
- Responsivo em dispositivos móveis
- Acessibilidade completa (ARIA)

## Componentes de Formulário

### ContactForm

Formulário de contato com validação Zod e integração Supabase.

#### Props

```typescript
interface ContactFormProps {
  onSuccess?: () => void;
  className?: string;
}
```

#### Uso

```tsx
import { ContactForm } from '@/components/forms/ContactForm';

<ContactForm 
  onSuccess={() => toast.success('Mensagem enviada!')}
  className="max-w-md mx-auto"
/>
```

#### Campos

- **name**: Nome completo (obrigatório)
- **email**: Email válido (obrigatório)
- **phone**: Telefone com máscara (opcional)
- **message**: Mensagem (obrigatório, min 10 caracteres)

#### Validação

```typescript
const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres')
});
```

## Componentes de Layout

### Header

Cabeçalho principal com navegação e menu responsivo.

#### Características

- Logo responsivo
- Menu de navegação
- Menu mobile (hamburger)
- Indicador de página ativa
- Animações suaves

#### Uso

```tsx
import { Header } from '@/components/layout/Header';

<Header />
```

### Footer

Rodapé com informações da empresa e links úteis.

#### Seções

- Informações de contato
- Links rápidos
- Redes sociais
- Copyright

## Componentes de Eventos

### EventCard

Card para exibição de eventos com informações principais.

#### Props

```typescript
interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  showActions?: boolean;
  className?: string;
}
```

#### Uso

```tsx
import { EventCard } from '@/components/events/EventCard';

<EventCard
  event={event}
  onEdit={handleEdit}
  onDelete={handleDelete}
  showActions={isAdmin}
/>
```

#### Informações Exibidas

- Título e descrição
- Data e horário
- Local
- Preço
- Status
- Ações (editar/excluir)

### EventForm

Formulário completo para criação/edição de eventos.

#### Props

```typescript
interface EventFormProps {
  event?: Event;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}
```

#### Campos

- **Informações Básicas**: título, descrição, tipo
- **Data e Horário**: data início/fim, horário
- **Local**: endereço, cidade, estado
- **Preços**: lotes de preços com datas
- **Configurações**: capacidade, status, visibilidade

## Hooks Customizados

### useSupabaseEvents

Hook para gerenciamento de eventos com Supabase.

#### Retorno

```typescript
interface UseSupabaseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  fetchEvents: (filters?: EventFilters) => Promise<void>;
  createEvent: (data: EventFormData) => Promise<Event>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  // ... outros métodos
}
```

#### Uso

```tsx
import { useSupabaseEvents } from '@/shared/hooks/hooks/useSupabaseEvents';

const {
  events,
  loading,
  error,
  fetchEvents,
  createEvent
} = useSupabaseEvents();

useEffect(() => {
  fetchEvents({ status: 'published' });
}, []);
```

### useSupabaseClients

Hook para gerenciamento de clientes.

#### Funcionalidades

- CRUD completo de clientes
- Filtros e paginação
- Cache inteligente
- Estados de loading/error

## Padrões de Design

### Cores

```css
/* Cores principais */
--primary: 220 90% 56%;
--secondary: 220 14% 96%;
--destructive: 0 84% 60%;
--muted: 220 14% 96%;
--accent: 220 14% 96%;
```

### Tipografia

- **Headings**: Inter, font-weight 600-700
- **Body**: Inter, font-weight 400-500
- **Code**: JetBrains Mono

### Espaçamento

- **Base**: 4px (0.25rem)
- **Componentes**: 8px, 12px, 16px, 24px
- **Layout**: 32px, 48px, 64px

### Responsividade

```css
/* Breakpoints */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## Acessibilidade

### Padrões Implementados

- **ARIA labels** em todos os componentes interativos
- **Focus management** em modais e formulários
- **Keyboard navigation** completa
- **Screen reader support**
- **Color contrast** WCAG AA

### Exemplo de Implementação

```tsx
<button
  aria-label="Fechar modal"
  aria-describedby="modal-description"
  onClick={onClose}
  className="focus:ring-2 focus:ring-primary"
>
  <X className="h-4 w-4" />
</button>
```

## Performance

### Otimizações Implementadas

- **Lazy loading** de componentes pesados
- **Memoização** com React.memo
- **Debounce** em campos de busca
- **Virtual scrolling** em listas grandes
- **Image optimization** com next/image

### Exemplo de Memoização

```tsx
const EventCard = React.memo(({ event, onEdit, onDelete }) => {
  return (
    <div className="event-card">
      {/* conteúdo do card */}
    </div>
  );
});
```

## Testes

### Cobertura de Componentes

- **Button**: 100% - Todas as variantes e estados
- **Modal**: 95% - Interações e acessibilidade
- **ContactForm**: 90% - Validação e submissão
- **EventCard**: 85% - Renderização e ações

### Exemplo de Teste

```typescript
describe('Button', () => {
  it('should render with correct variant class', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });
});
```

## Contribuição

### Criando Novos Componentes

1. **Estrutura**: Siga o padrão de pastas existente
2. **Props**: Use TypeScript interfaces
3. **Styling**: Use Tailwind CSS
4. **Testes**: Cobertura mínima de 80%
5. **Documentação**: Adicione exemplos de uso

### Exemplo de Estrutura

```
src/components/ui/NewComponent/
├── index.ts
├── NewComponent.tsx
├── NewComponent.stories.tsx
└── __tests__/
    └── NewComponent.test.tsx
```

## Recursos Adicionais

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)