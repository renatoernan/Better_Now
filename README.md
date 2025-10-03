<div align="center">
  <h1>🎉 Better Now</h1>
  <p>Plataforma completa de gerenciamento de eventos</p>
</div>

## 📋 Sobre o Projeto

Better Now é uma plataforma moderna e completa para gerenciamento de eventos, desenvolvida com React e TypeScript. A aplicação oferece uma experiência intuitiva tanto para organizadores quanto para participantes, com funcionalidades avançadas de administração, autenticação e sistema de ingressos.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 19** com TypeScript rigoroso
- **Vite** como build tool e dev server
- **Tailwind CSS** para estilização
- **React Router DOM** para roteamento
- **Lucide React** para ícones
- **Framer Motion** para animações
- **React Hook Form** + **Zod** para formulários e validação

### Backend & Infraestrutura
- **Supabase** (PostgreSQL, Auth, Storage, Real-time)
- **Row Level Security (RLS)** para segurança de dados
- **Supabase Storage** para upload de imagens/vídeos

### Desenvolvimento & Qualidade
- **TypeScript** com configuração rigorosa
- **ESLint** + **Prettier** para padronização
- **Jest** + **React Testing Library** para testes
- **Husky** para git hooks
- **Conventional Commits** para padronização de commits

### Performance & UX
- **Lazy Loading** de componentes e rotas
- **Sistema de Cache Inteligente** com TTL e LRU
- **Debounce** em buscas e inputs
- **Compressão** automática de imagens
- **Real-time subscriptions** para atualizações instantâneas

## ✨ Funcionalidades Principais

### 🎪 Sistema de Eventos
- Criação e gerenciamento de eventos públicos
- Sistema de lotes de preços para ingressos
- Upload e galeria de imagens
- Descrições com suporte a Markdown
- Cronograma detalhado de atividades

### 👥 Área Administrativa
- Dashboard completo para organizadores
- Gerenciamento de eventos, ingressos e participantes
- Sistema de autenticação seguro
- Controle de acesso baseado em roles

### 💬 Interação com Clientes
- Sistema de depoimentos de clientes
- Formulários de contato integrados
- Área "Sobre Nós" institucional

## 📁 Estrutura do Projeto

```
Better_Now/
├── src/
│   ├── components/          # Componentes React organizados
│   │   ├── ui/             # Biblioteca de componentes base
│   │   ├── forms/          # Componentes de formulários
│   │   ├── layout/         # Componentes de layout
│   │   └── features/       # Componentes específicos de funcionalidades
│   ├── pages/              # Páginas da aplicação
│   │   ├── public/         # Páginas públicas
│   │   └── admin/          # Páginas administrativas
│   ├── shared/             # Recursos compartilhados
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # Definições TypeScript
│   │   ├── utils/          # Funções utilitárias
│   │   ├── contexts/       # Contextos React
│   │   └── schemas/        # Schemas de validação Zod
│   ├── assets/             # Recursos estáticos
│   └── test/               # Configurações de teste
├── docs/                   # Documentação do projeto
├── supabase/              # Configurações e migrações Supabase
├── api/                   # Backend Express.js (se aplicável)
└── dist/                  # Build de produção
```

### Organização Modular

O projeto segue uma arquitetura modular com separação clara de responsabilidades:

- **Componentes UI**: Biblioteca reutilizável de componentes base
- **Features**: Componentes específicos de funcionalidades
- **Hooks Customizados**: Lógica reutilizável encapsulada
- **Schemas Zod**: Validação tipada e consistente
- **Utilitários**: Funções auxiliares e helpers

## 🛠️ Pré-requisitos

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- Conta no **Supabase**

## 📦 Instalação

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd Better_Now
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   
   Crie um arquivo `.env.local` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

4. **Configure o banco de dados:**
   
   Execute as migrações SQL localizadas em `database/` no seu projeto Supabase.

5. **Execute a aplicação:**
   ```bash
   npm run dev
   ```

   A aplicação estará disponível em `http://localhost:5173`

## 🗄️ Configuração do Supabase

### Tabelas Principais
- `events` - Informações dos eventos
- `tickets` - Sistema de ingressos e lotes
- `testimonials` - Depoimentos de clientes
- `contacts` - Formulários de contato
- `users` - Dados dos usuários (complementar ao Auth)

### Políticas de Segurança (RLS)
O projeto utiliza Row Level Security para garantir que:
- Usuários só acessem seus próprios dados
- Administradores tenham acesso completo
- Dados públicos sejam acessíveis a todos

### Storage
Configurado para upload de imagens de eventos com:
- Redimensionamento automático
- Otimização de performance
- Controle de acesso baseado em políticas

## 📜 Scripts Disponíveis

### Desenvolvimento
```bash
pnpm dev             # Inicia servidor de desenvolvimento (http://localhost:5173)
pnpm build           # Gera build otimizado para produção
pnpm preview         # Visualiza o build de produção localmente
pnpm check           # Verifica tipos TypeScript
```

### Testes
```bash
pnpm test            # Executa todos os testes
pnpm test:watch      # Executa testes em modo watch
pnpm test:coverage   # Gera relatório de cobertura
pnpm test:ci         # Executa testes para CI/CD
```

### Qualidade de Código
```bash
pnpm lint            # Executa ESLint
pnpm lint:fix        # Corrige problemas do ESLint automaticamente
pnpm format          # Formata código com Prettier
pnpm type-check      # Verifica tipos TypeScript sem build
```

### Supabase (se configurado)
```bash
pnpm supabase:start  # Inicia Supabase local
pnpm supabase:stop   # Para Supabase local
pnpm supabase:reset  # Reseta banco local
```

## 🎨 Características Técnicas

### Arquitetura & Padrões
- **Arquitetura Modular**: Separação clara de responsabilidades
- **Clean Code**: Padrões de código consistentes e legíveis
- **SOLID Principles**: Aplicação dos princípios de design
- **Composition over Inheritance**: Favorece composição de componentes

### Performance & Otimização
- **Code Splitting**: Divisão automática do bundle
- **Lazy Loading**: Carregamento sob demanda de componentes
- **Tree Shaking**: Eliminação de código não utilizado
- **Sistema de Cache**: Cache inteligente com TTL e LRU
- **Debounce**: Otimização de buscas e inputs
- **Image Optimization**: Compressão automática de imagens

### Testes & Qualidade
- **Jest + React Testing Library**: Framework de testes robusto
- **Cobertura de Testes**: Mínimo de 50% de cobertura global
- **Testes Unitários**: Componentes e hooks testados
- **Testes de Integração**: Fluxos principais cobertos
- **CI/CD**: Integração contínua configurada

### Segurança
- **Row Level Security (RLS)**: Políticas de segurança no banco
- **Autenticação JWT**: Sistema seguro de autenticação
- **Validação Rigorosa**: Schemas Zod para validação de dados
- **CORS Configurado**: Proteção contra requisições maliciosas

### Acessibilidade
- **WCAG 2.1 AA**: Conformidade com padrões de acessibilidade
- **ARIA Labels**: Suporte completo a screen readers
- **Keyboard Navigation**: Navegação por teclado em todos os componentes
- **Focus Management**: Gerenciamento adequado de foco

## 📊 Métricas de Qualidade

### Cobertura de Testes
- **Global**: 50%+ de cobertura
- **Componentes UI**: 70%+ de cobertura
- **Hooks Customizados**: 65%+ de cobertura
- **Utilitários**: 80%+ de cobertura

### Performance
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3s

### Bundle Size
- **Initial Bundle**: ~150KB (gzipped)
- **Vendor Chunks**: Otimizados para cache
- **Dynamic Imports**: Redução de 40% no bundle inicial

## 🔧 Configuração de Desenvolvimento

### Ambiente Local
1. **Node.js 18+** instalado
2. **pnpm** como gerenciador de pacotes
3. **VS Code** com extensões recomendadas:
   - TypeScript
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense

### Variáveis de Ambiente
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Desenvolvimento
VITE_APP_ENV=development
VITE_API_URL=http://localhost:3000
```

### Git Hooks
- **pre-commit**: Executa lint e type-check
- **commit-msg**: Valida formato de commit
- **pre-push**: Executa testes completos

## 📚 Documentação Adicional

- [**Guia de Testes**](./docs/TESTING_GUIDE.md) - Configuração e padrões de teste
- [**Documentação de Componentes**](./docs/COMPONENT_DOCUMENTATION.md) - Guia completo dos componentes
- [**Arquitetura Técnica**](./.trae/documents/Better_Now_Arquitetura_Tecnica.md) - Detalhes da arquitetura
- [**API Documentation**](./docs/API_DOCUMENTATION.md) - Documentação das APIs

## 🤝 Contribuição

### Padrões de Commit
Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
style: mudanças de formatação
refactor: refatoração de código
test: adiciona ou modifica testes
chore: tarefas de manutenção
```

### Fluxo de Desenvolvimento
1. **Fork** do repositório
2. **Branch** para nova feature: `git checkout -b feature/nova-funcionalidade`
3. **Commit** das mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. **Push** para a branch: `git push origin feature/nova-funcionalidade`
5. **Pull Request** com descrição detalhada

### Code Review
- Todos os PRs passam por review
- Testes devem passar
- Cobertura não pode diminuir
- Documentação deve ser atualizada

## 🚀 Deploy

### Produção
```bash
# Build otimizado
pnpm build

# Deploy para Vercel/Netlify
pnpm deploy
```

### Ambientes
- **Development**: http://localhost:5173
- **Staging**: https://staging.betternow.app
- **Production**: https://betternow.app

## 📞 Suporte

Para dúvidas, sugestões ou problemas:

- **Issues**: [GitHub Issues](link-para-issues)
- **Discussões**: [GitHub Discussions](link-para-discussions)
- **Email**: suporte@betternow.app

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">
  <p>Desenvolvido com ❤️ pela equipe Better Now</p>
  <p>© 2024 Better Now. Todos os direitos reservados.</p>
</div>
- **Cache Inteligente**: Sistema de cache com TTL e LRU
- **Image Optimization**: Compressão e lazy loading de imagens
- **Bundle Analysis**: Análise e otimização do tamanho do bundle

### Qualidade & Testes
- **TypeScript Rigoroso**: Tipagem estrita em todo o projeto
- **Testes Unitários**: Jest + React Testing Library
- **Testes de Integração**: Cypress para fluxos críticos
- **Coverage Reports**: Relatórios de cobertura de testes
- **ESLint + Prettier**: Padronização automática de código
- **Husky**: Git hooks para qualidade de código

### UX & Acessibilidade
- **Design Responsivo**: Adaptável para todos os dispositivos
- **WCAG 2.1 AA**: Conformidade com padrões de acessibilidade
- **Keyboard Navigation**: Navegação completa por teclado
- **Screen Reader**: Compatibilidade com leitores de tela
- **Focus Management**: Gerenciamento inteligente de foco
- **Color Contrast**: Contraste adequado para todos os elementos

### Segurança
- **Row Level Security**: Políticas de segurança no banco
- **Input Validation**: Validação rigorosa de entradas
- **XSS Protection**: Proteção contra ataques XSS
- **CSRF Protection**: Proteção contra ataques CSRF
- **Secure Headers**: Cabeçalhos de segurança configurados

### Monitoramento & Analytics
- **Error Tracking**: Rastreamento automático de erros
- **Performance Monitoring**: Monitoramento de performance
- **User Analytics**: Análise de comportamento do usuário
- **Real-time Metrics**: Métricas em tempo real

## 🏢 Empresa Desenvolvedora

**CESIRE Tecnologia**

Este projeto foi desenvolvido pela [CESIRE](https://www.cesire.com.br), uma empresa especializada em soluções tecnológicas inovadoras. A CESIRE tem como missão criar aplicações modernas e eficientes que atendam às necessidades específicas de cada cliente.

### Sobre a CESIRE
- 🚀 **Especialização:** Desenvolvimento de aplicações web e mobile
- 💡 **Foco:** Soluções personalizadas e tecnologias modernas
- 🎯 **Missão:** Transformar ideias em produtos digitais de alta qualidade
- 🌐 **Website:** [www.cesire.com.br](https://www.cesire.com.br)

---

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

<div align="center">
  Desenvolvido com ❤️ para facilitar o gerenciamento de eventos
</div>
