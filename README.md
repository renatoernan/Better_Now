<div align="center">
  <h1>🎉 Better Now</h1>
  <p>Plataforma completa de gerenciamento de eventos</p>
</div>

## 📋 Sobre o Projeto

Better Now é uma plataforma moderna e completa para gerenciamento de eventos, desenvolvida com React e TypeScript. A aplicação oferece uma experiência intuitiva tanto para organizadores quanto para participantes, com funcionalidades avançadas de administração, autenticação e sistema de ingressos.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Database, Auth, Storage)
- **Roteamento:** React Router DOM
- **Ícones:** Lucide React
- **Gerenciamento de Estado:** React Context + Hooks
- **Formatação:** Suporte a Markdown

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
src/
├── components/          # Componentes React organizados por categoria
│   ├── admin/          # Componentes da área administrativa
│   ├── public/         # Componentes públicos
│   └── shared/         # Componentes compartilhados
├── contexts/           # Contextos React (Auth, etc.)
├── hooks/              # Custom hooks
├── pages/              # Páginas da aplicação
├── types/              # Definições de tipos TypeScript
├── utils/              # Funções utilitárias
├── assets/             # Imagens e recursos estáticos
└── schemas/            # Schemas de validação

database/               # Scripts SQL e migrações
supabase/              # Configurações do Supabase
```

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

```bash
npm run dev          # Inicia o servidor de desenvolvimento
npm run build        # Gera build de produção
npm run preview      # Visualiza o build de produção
npm run lint         # Executa o linter
npm run type-check   # Verifica tipos TypeScript
```

## 🎨 Características Técnicas

- **Responsivo:** Interface adaptável para desktop, tablet e mobile
- **Acessibilidade:** Componentes seguem padrões WCAG
- **Performance:** Lazy loading e otimizações de bundle
- **SEO:** Meta tags e estrutura semântica
- **Tipagem:** TypeScript rigoroso em todo o projeto

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
