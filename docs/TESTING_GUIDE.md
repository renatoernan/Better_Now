# Guia de Testes - Better Now

## Visão Geral

Este projeto utiliza uma configuração robusta de testes com Jest e React Testing Library para garantir a qualidade e confiabilidade do código.

## Configuração de Testes

### Tecnologias Utilizadas

- **Jest**: Framework de testes principal
- **React Testing Library**: Para testes de componentes React
- **@testing-library/jest-dom**: Matchers customizados para DOM
- **ts-jest**: Suporte para TypeScript

### Estrutura de Arquivos

```
src/
├── components/
│   └── __tests__/          # Testes de componentes
├── shared/
│   └── hooks/
│       └── __tests__/      # Testes de hooks
└── test/
    └── setup.ts            # Configuração global dos testes
```

## Executando Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
pnpm test

# Executar testes com cobertura
pnpm test:coverage

# Executar testes em modo watch
pnpm test:watch

# Executar testes específicos
pnpm test Button.test.tsx
```

### Configuração de Cobertura

O projeto está configurado com thresholds de cobertura:

- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%
- **Statements**: 50%

Os relatórios de cobertura são gerados em múltiplos formatos:
- **text**: Saída no terminal
- **lcov**: Para integração com ferramentas externas
- **html**: Relatório visual em `coverage/lcov-report/index.html`
- **json-summary**: Resumo em JSON

## Padrões de Teste

### Testes de Componentes

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testes de Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';

describe('useCustomHook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCustomHook());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});
```

## Mocks e Configuração

### Mocks Globais

O arquivo `src/test/setup.ts` contém mocks globais para:

- **Supabase**: Cliente mockado para testes
- **React Router**: Navegação mockada
- **Framer Motion**: Animações desabilitadas
- **Sonner**: Toast notifications mockadas
- **Web APIs**: matchMedia, IntersectionObserver, ResizeObserver

### Mocks Específicos

Para testes específicos, utilize mocks locais:

```typescript
jest.mock('../../services/lib/supabase', () => ({
  supabase: mockSupabaseClient
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));
```

## Boas Práticas

### 1. Nomenclatura de Testes

- Use descrições claras e específicas
- Siga o padrão: "should [expected behavior] when [condition]"

### 2. Organização

- Agrupe testes relacionados em `describe` blocks
- Use `beforeEach` para setup comum
- Limpe mocks após cada teste

### 3. Assertions

- Teste comportamentos, não implementação
- Use matchers semânticos do jest-dom
- Evite testes muito específicos de CSS

### 4. Async Testing

```typescript
it('should handle async operations', async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Problemas Comuns

1. **Module not found**: Verifique os paths no `moduleNameMapper`
2. **TextEncoder not defined**: Já configurado no setup.ts
3. **Supabase errors**: Use os mocks fornecidos

### Debug de Testes

```typescript
// Para debug visual
import { screen } from '@testing-library/react';
screen.debug(); // Mostra o DOM atual

// Para logs específicos
console.log(screen.getByTestId('my-element'));
```

## Integração Contínua

Os testes são executados automaticamente em:
- Pull requests
- Commits na branch main
- Builds de produção

### Configuração CI/CD

```yaml
- name: Run tests
  run: pnpm test:coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Métricas de Qualidade

### Cobertura Atual

- Componentes UI: ~70% de cobertura
- Hooks customizados: ~65% de cobertura
- Utilitários: ~80% de cobertura

### Objetivos

- Manter cobertura global acima de 50%
- Cobertura de componentes críticos acima de 80%
- Zero testes falhando em produção

## Recursos Adicionais

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)