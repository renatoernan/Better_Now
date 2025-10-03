# Guia de Manutenção - Better Now

## Visão Geral

Este guia fornece instruções detalhadas para manutenção, monitoramento e resolução de problemas do sistema Better Now.

## 🔧 Manutenção Preventiva

### Atualizações de Dependências

#### Verificação Mensal
```bash
# Verificar dependências desatualizadas
pnpm outdated

# Atualizar dependências patch/minor
pnpm update

# Verificar vulnerabilidades
pnpm audit
```

#### Atualizações Major
```bash
# Verificar atualizações major disponíveis
pnpm outdated --long

# Atualizar uma dependência específica
pnpm add package-name@latest

# Testar após atualizações
pnpm test && pnpm build
```

### Limpeza de Cache

#### Cache do Node.js
```bash
# Limpar cache do pnpm
pnpm store prune

# Limpar node_modules e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Cache do Build
```bash
# Limpar cache do Vite
rm -rf dist .vite

# Rebuild completo
pnpm build
```

### Backup de Dados

#### Backup do Supabase
```sql
-- Backup das tabelas principais
pg_dump -h your-host -U postgres -d your-db -t events > backup_events.sql
pg_dump -h your-host -U postgres -d your-db -t testimonials > backup_testimonials.sql
pg_dump -h your-host -U postgres -d your-db -t contacts > backup_contacts.sql
```

#### Backup de Arquivos
```bash
# Backup do storage do Supabase
supabase storage download --recursive bucket-name ./backup/storage/
```

## 📊 Monitoramento

### Métricas de Performance

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

#### Monitoramento de Bundle
```bash
# Analisar tamanho do bundle
pnpm build
pnpm bundle-analyzer

# Verificar dependências não utilizadas
pnpm depcheck
```

### Logs e Erros

#### Configuração de Logging
```typescript
// src/shared/utils/logger.ts
export const logger = {
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
    // Enviar para serviço de monitoramento
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
  },
  info: (message: string) => {
    console.info(`[INFO] ${message}`);
  }
};
```

#### Monitoramento de Erros
```typescript
// Configurar error boundary global
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason);
});

window.addEventListener('error', (event) => {
  logger.error('Global error', event.error);
});
```

### Saúde do Sistema

#### Health Check Endpoint
```typescript
// api/health.ts
export const healthCheck = async () => {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    auth: await checkAuth(),
    timestamp: new Date().toISOString()
  };
  
  return {
    status: Object.values(checks).every(Boolean) ? 'healthy' : 'unhealthy',
    checks
  };
};
```

## 🐛 Resolução de Problemas

### Problemas Comuns

#### 1. Erro de Build
```bash
# Sintomas: Build falha com erros TypeScript
# Solução:
pnpm type-check
pnpm lint --fix
rm -rf node_modules && pnpm install
```

#### 2. Problemas de Performance
```bash
# Sintomas: Aplicação lenta
# Diagnóstico:
pnpm build
pnpm preview
# Usar DevTools para analisar performance

# Soluções:
# - Implementar lazy loading
# - Otimizar imagens
# - Revisar re-renders desnecessários
```

#### 3. Erros de Supabase
```typescript
// Sintomas: Erros de conexão com Supabase
// Diagnóstico:
const { data, error } = await supabase
  .from('events')
  .select('*')
  .limit(1);

if (error) {
  logger.error('Supabase connection error', error);
}

// Soluções:
// - Verificar variáveis de ambiente
// - Verificar políticas RLS
// - Verificar limites de rate limiting
```

#### 4. Problemas de Autenticação
```typescript
// Sintomas: Usuários não conseguem fazer login
// Diagnóstico:
const { data: { session }, error } = await supabase.auth.getSession();

// Soluções:
// - Verificar configuração de auth no Supabase
// - Verificar URLs de redirect
// - Limpar localStorage/sessionStorage
```

### Debugging

#### Ferramentas de Debug
```typescript
// React DevTools
// - Instalar extensão do navegador
// - Usar Profiler para performance
// - Analisar component tree

// Redux DevTools (se usando Zustand)
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools((set) => ({
    // store implementation
  }))
);
```

#### Logs Estruturados
```typescript
// src/shared/utils/debug.ts
export const debug = {
  component: (name: string, props: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[COMPONENT] ${name}`, props);
    }
  },
  hook: (name: string, state: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[HOOK] ${name}`, state);
    }
  },
  api: (endpoint: string, data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${endpoint}`, data);
    }
  }
};
```

## 🔄 Atualizações de Sistema

### Processo de Deploy

#### 1. Preparação
```bash
# Executar testes completos
pnpm test:coverage

# Verificar build
pnpm build

# Verificar tipos
pnpm type-check

# Verificar lint
pnpm lint
```

#### 2. Deploy Staging
```bash
# Deploy para ambiente de staging
git checkout staging
git merge main
git push origin staging

# Verificar funcionamento
curl https://staging.betternow.app/health
```

#### 3. Deploy Produção
```bash
# Deploy para produção
git checkout main
git tag v1.x.x
git push origin main --tags

# Monitorar após deploy
# - Verificar logs
# - Monitorar métricas
# - Testar funcionalidades críticas
```

### Rollback

#### Rollback Rápido
```bash
# Reverter para versão anterior
git revert HEAD
git push origin main

# Ou usar tag anterior
git checkout v1.x.x-1
git push origin main --force-with-lease
```

#### Rollback de Banco
```sql
-- Reverter migração específica
-- (Manter backups antes de migrações)
-- Executar script de rollback correspondente
```

## 📈 Otimização Contínua

### Performance

#### Bundle Analysis
```bash
# Analisar bundle mensalmente
pnpm build
pnpm bundle-analyzer

# Identificar:
# - Dependências grandes desnecessárias
# - Código duplicado
# - Oportunidades de code splitting
```

#### Database Optimization
```sql
-- Analisar queries lentas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Verificar índices
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'events';
```

### SEO e Acessibilidade

#### Auditoria Mensal
```bash
# Usar Lighthouse CLI
npx lighthouse https://betternow.app --output=json --output-path=./audit.json

# Verificar:
# - Performance score > 90
# - Accessibility score > 95
# - Best Practices score > 90
# - SEO score > 90
```

## 🔐 Segurança

### Auditoria de Segurança

#### Dependências
```bash
# Verificar vulnerabilidades mensalmente
pnpm audit

# Atualizar dependências com vulnerabilidades
pnpm audit --fix
```

#### Configurações
```typescript
// Verificar configurações de segurança
const securityChecklist = {
  cors: 'Configurado corretamente',
  rls: 'Políticas ativas no Supabase',
  auth: 'JWT tokens seguros',
  env: 'Variáveis sensíveis não expostas',
  https: 'SSL/TLS configurado'
};
```

### Backup e Recuperação

#### Estratégia de Backup
- **Diário**: Backup automático do banco de dados
- **Semanal**: Backup completo incluindo storage
- **Mensal**: Backup arquivado para longo prazo

#### Teste de Recuperação
```bash
# Testar recuperação trimestralmente
# 1. Restaurar backup em ambiente de teste
# 2. Verificar integridade dos dados
# 3. Testar funcionalidades críticas
# 4. Documentar tempo de recuperação
```

## 📋 Checklist de Manutenção

### Semanal
- [ ] Verificar logs de erro
- [ ] Monitorar métricas de performance
- [ ] Verificar status dos serviços
- [ ] Revisar alertas de monitoramento

### Mensal
- [ ] Atualizar dependências
- [ ] Executar auditoria de segurança
- [ ] Analisar performance do bundle
- [ ] Revisar e otimizar queries do banco
- [ ] Executar testes de carga

### Trimestral
- [ ] Auditoria completa de segurança
- [ ] Teste de recuperação de backup
- [ ] Revisão da arquitetura
- [ ] Planejamento de atualizações major
- [ ] Análise de custos de infraestrutura

### Anual
- [ ] Revisão completa da documentação
- [ ] Atualização do plano de disaster recovery
- [ ] Auditoria de compliance
- [ ] Planejamento de roadmap técnico

## 📞 Contatos de Emergência

### Equipe Técnica
- **Tech Lead**: tech-lead@betternow.app
- **DevOps**: devops@betternow.app
- **Suporte**: suporte@betternow.app

### Serviços Externos
- **Supabase Support**: Via dashboard do Supabase
- **Vercel Support**: Via dashboard da Vercel
- **CDN Provider**: Conforme contrato

## 📚 Recursos Adicionais

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Troubleshooting](https://vitejs.dev/guide/troubleshooting.html)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Web Performance Best Practices](https://web.dev/performance/)

---

*Este guia deve ser revisado e atualizado regularmente conforme o sistema evolui.*