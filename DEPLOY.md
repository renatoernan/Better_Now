# Deploy Guide - Better Now

## Configuração do Vercel

### 1. Variáveis de Ambiente no Vercel

Configure as seguintes variáveis de ambiente no painel do Vercel:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://waeyfjvwhhnwqregofda.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZXlmanZ3aGhud3FyZWdvZmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgxODUsImV4cCI6MjA4NjU4NDE4NX0.3RrL31r0V8IKC-VXFGdlXtfZffPJr48hAaXql0GTfdw

# Application Configuration
NODE_ENV=production
VITE_APP_TITLE=Better Now - Planejamento de Eventos
VITE_APP_DESCRIPTION=Plataforma completa para planejamento e gestão de eventos
VITE_APP_VERSION=1.0.0

# Performance and Security
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_API_TIMEOUT=30000

# Build Configuration
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
```

### 2. Configurações do Projeto no Vercel

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### 3. Configurações Avançadas

#### Headers de Segurança
O arquivo `vercel.json` já inclui headers de segurança:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

#### Cache Configuration
- Assets estáticos: Cache por 1 ano (immutable)
- HTML: Cache com revalidação obrigatória
- API responses: Cache configurável

#### Redirects
- `/admin` → `/admin/dashboard` (temporário)

### 4. Deploy via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

### 5. Deploy via Git

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. O deploy será automático a cada push na branch main

### 6. Verificações Pós-Deploy

1. **Funcionalidade**: Teste todas as rotas principais
2. **Performance**: Verifique o Lighthouse score
3. **Segurança**: Confirme os headers de segurança
4. **Supabase**: Teste a conexão com o banco de dados
5. **Assets**: Verifique se imagens e recursos estão carregando

### 7. Monitoramento

- Use o painel do Vercel para monitorar performance
- Configure alertas para erros 4xx/5xx
- Monitore o uso de bandwidth e function executions

### 8. Troubleshooting

#### Erro de Build
```bash
# Limpar cache e reinstalar dependências
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Erro de Routing
- Verifique se o `vercel.json` tem as rewrites corretas
- Confirme que é uma SPA (Single Page Application)

#### Erro de Environment Variables
- Verifique se todas as variáveis começam com `VITE_`
- Confirme se estão configuradas no painel do Vercel

### 9. Performance Optimization

- **Code Splitting**: Já configurado no `vite.config.ts`
- **Image Optimization**: Plugin imagemin configurado
- **Bundle Analysis**: Use `npm run build` para ver o tamanho dos chunks
- **Preloading**: Considere adicionar preload para recursos críticos

### 10. Security Checklist

- ✅ Headers de segurança configurados
- ✅ HTTPS forçado (automático no Vercel)
- ✅ Variáveis sensíveis não expostas no frontend
- ✅ CSP headers (considere adicionar se necessário)
- ✅ Rate limiting (configure se necessário)

## Comandos Úteis

```bash
# Build local para teste
npm run build:prod

# Preview do build
npm run preview

# Lint e fix
npm run lint:fix

# Testes
npm run test:ci
```