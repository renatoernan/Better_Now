# Better Now - Guia de Componentes

## Visão Geral

Este guia documenta todos os componentes UI do projeto Better Now, incluindo props, exemplos de uso e padrões de design.

## Biblioteca UI Base

### Button

Componente de botão versátil com múltiplas variações.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
  asChild?: boolean;
}
```

**Exemplos:**
```tsx
// Botão padrão
<Button>Clique aqui</Button>

// Botão secundário
<Button variant="secondary">Cancelar</Button>

// Botão com loading
<Button loading>Salvando...</Button>

// Botão grande
<Button size="lg">Botão Grande</Button>

// Botão destrutivo
<Button variant="destructive">Excluir</Button>
```

**Variações:**
- `default`: Azul primário, texto branco
- `secondary`: Cinza, texto escuro
- `outline`: Borda azul, fundo transparente
- `destructive`: Vermelho, para ações perigosas
- `ghost`: Transparente, hover sutil

### Input

Campo de entrada de texto com validação visual.

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
}
```

**Exemplos:**
```tsx
// Input básico
<Input placeholder="Digite seu nome" />

// Input com erro
<Input error helperText="Campo obrigatório" />

// Input controlado
<Input 
  value={value} 
  onChange={(e) => setValue(e.target.value)} 
/>
```

### Modal

Modal responsivo com overlay e controles de acessibilidade.

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

**Exemplos:**
```tsx
// Modal básico
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Título">
  <p>Conteúdo do modal</p>
</Modal>

// Modal grande
<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <ComplexForm />
</Modal>
```

**Recursos:**
- Trap de foco automático
- Fechamento com ESC
- Overlay clicável
- Animações suaves
- Responsivo

### Card

Container para agrupar conteúdo relacionado.

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: boolean;
}
```

**Exemplos:**
```tsx
// Card básico
<Card>
  <h3>Título</h3>
  <p>Conteúdo</p>
</Card>

// Card com sombra
<Card shadow padding="lg">
  <EventDetails />
</Card>
```

## Componentes de Formulário

### ContactForm

Formulário de contato com validação completa.

```typescript
interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  initialData?: Partial<ContactFormData>;
  loading?: boolean;
}
```

**Exemplo:**
```tsx
<ContactForm 
  onSubmit={handleSubmit}
  loading={isSubmitting}
/>
```

**Validações:**
- Nome: obrigatório, mínimo 2 caracteres
- Email: formato válido
- Telefone: formato brasileiro
- Mensagem: mínimo 10 caracteres

### EventForm

Formulário para criação/edição de eventos.

```typescript
interface EventFormProps {
  onSubmit: (data: EventFormData) => Promise<void>;
  initialData?: Event;
  loading?: boolean;
  mode: 'create' | 'edit';
}
```

**Recursos:**
- Upload de múltiplas imagens
- Seleção de data/hora
- Configuração de lotes de preços
- Validação em tempo real

### ClientForm

Formulário de cadastro de clientes.

```typescript
interface ClientFormProps {
  onSubmit: (data: ClientFormData) => Promise<void>;
  initialData?: Client;
  loading?: boolean;
}
```

**Validações:**
- CPF: formato e validação
- CEP: busca automática de endereço
- Telefone: máscara automática
- Email: verificação de formato

## Componentes de Layout

### Header

Cabeçalho principal da aplicação.

```typescript
interface HeaderProps {
  user?: User;
  onLogout?: () => void;
  showNavigation?: boolean;
}
```

**Recursos:**
- Menu responsivo
- Avatar do usuário
- Navegação principal
- Logout seguro

### Sidebar

Barra lateral para navegação administrativa.

```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}
```

**Itens de Menu:**
- Dashboard
- Eventos
- Clientes
- Depoimentos
- Configurações

### Footer

Rodapé com informações da empresa.

```typescript
interface FooterProps {
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
}
```

## Componentes de Dados

### EventCard

Card para exibição de eventos.

```typescript
interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  showActions?: boolean;
  variant?: 'default' | 'compact';
}
```

**Exemplo:**
```tsx
<EventCard 
  event={event}
  onEdit={handleEdit}
  onDelete={handleDelete}
  showActions={isAdmin}
/>
```

### ClientCard

Card para exibição de clientes.

```typescript
interface ClientCardProps {
  client: Client;
  onEdit?: (client: Client) => void;
  onDelete?: (clientId: string) => void;
  showActions?: boolean;
}
```

### TestimonialCard

Card para exibição de depoimentos.

```typescript
interface TestimonialCardProps {
  testimonial: Testimonial;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions?: boolean;
}
```

## Componentes de Feedback

### LoadingSpinner

Indicador de carregamento.

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary';
  text?: string;
}
```

**Exemplos:**
```tsx
// Spinner básico
<LoadingSpinner />

// Spinner com texto
<LoadingSpinner text="Carregando eventos..." />

// Spinner grande
<LoadingSpinner size="lg" />
```

### ErrorBoundary

Captura e exibe erros de componentes.

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error}>;
}
```

**Uso:**
```tsx
<ErrorBoundary>
  <ComplexComponent />
</ErrorBoundary>
```

### Toast

Sistema de notificações (usando Sonner).

```typescript
// Uso através do hook
const { toast } = useToast();

toast.success('Evento criado com sucesso!');
toast.error('Erro ao salvar dados');
toast.info('Informação importante');
toast.warning('Atenção necessária');
```

## Componentes de Navegação

### Breadcrumb

Navegação hierárquica.

```typescript
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}
```

**Exemplo:**
```tsx
<Breadcrumb items={[
  { label: 'Dashboard', href: '/admin' },
  { label: 'Eventos', href: '/admin/events' },
  { label: 'Novo Evento', active: true }
]} />
```

### Pagination

Componente de paginação.

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
}
```

## Padrões de Design

### Cores
- **Primária**: Azul (#3B82F6)
- **Secundária**: Cinza (#6B7280)
- **Sucesso**: Verde (#10B981)
- **Erro**: Vermelho (#EF4444)
- **Aviso**: Amarelo (#F59E0B)

### Tipografia
- **Títulos**: Inter, peso 600-700
- **Corpo**: Inter, peso 400-500
- **Código**: Fira Code, monoespaçada

### Espaçamento
- **Pequeno**: 0.5rem (8px)
- **Médio**: 1rem (16px)
- **Grande**: 1.5rem (24px)
- **Extra Grande**: 2rem (32px)

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## Acessibilidade

### Padrões Implementados
- **ARIA Labels**: Todos os componentes interativos
- **Keyboard Navigation**: Suporte completo
- **Focus Management**: Trap de foco em modais
- **Screen Readers**: Compatibilidade total
- **Color Contrast**: WCAG AA compliant

### Exemplos de Uso Acessível
```tsx
// Botão com ARIA
<Button aria-label="Excluir evento" variant="destructive">
  <TrashIcon />
</Button>

// Input com descrição
<Input 
  aria-describedby="email-help"
  placeholder="Email"
/>
<span id="email-help">Digite um email válido</span>

// Modal com foco
<Modal isOpen={isOpen} onClose={onClose} title="Confirmar exclusão">
  <p>Tem certeza que deseja excluir este evento?</p>
  <Button autoFocus variant="destructive">Confirmar</Button>
</Modal>
```

## Performance

### Otimizações Implementadas
- **Lazy Loading**: Componentes carregados sob demanda
- **Memoização**: React.memo em componentes pesados
- **Virtual Scrolling**: Listas grandes virtualizadas
- **Image Optimization**: Lazy loading e compressão

### Exemplo de Componente Otimizado
```tsx
const EventCard = React.memo(({ event, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => onEdit(event), [event, onEdit]);
  const handleDelete = useCallback(() => onDelete(event.id), [event.id, onDelete]);
  
  return (
    <Card>
      <img 
        src={event.image} 
        loading="lazy" 
        alt={event.title}
      />
      <h3>{event.title}</h3>
      <Button onClick={handleEdit}>Editar</Button>
      <Button onClick={handleDelete} variant="destructive">Excluir</Button>
    </Card>
  );
});
```

## Testes

### Estratégia de Testes
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Cypress
- **Visual Tests**: Storybook + Chromatic

### Exemplo de Teste
```typescript
describe('Button Component', () => {
  it('renders with correct variant', () => {
    render(<Button variant="secondary">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Storybook (Futuro)

### Estrutura Planejada
```
stories/
├── Button.stories.tsx
├── Input.stories.tsx
├── Modal.stories.tsx
├── EventCard.stories.tsx
└── ...
```

### Exemplo de Story
```typescript
export default {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'outline', 'destructive', 'ghost']
    }
  }
};

export const Default = {
  args: {
    children: 'Button'
  }
};

export const Loading = {
  args: {
    children: 'Loading...',
    loading: true
  }
};
```

## Contribuição

### Adicionando Novos Componentes
1. Criar arquivo na pasta apropriada
2. Implementar TypeScript interfaces
3. Adicionar testes unitários
4. Documentar props e exemplos
5. Seguir padrões de acessibilidade
6. Otimizar para performance

### Padrões de Código
- Use TypeScript rigoroso
- Implemente PropTypes/interfaces
- Adicione testes para todos os casos
- Documente comportamentos especiais
- Siga convenções de nomenclatura
- Mantenha componentes pequenos e focados