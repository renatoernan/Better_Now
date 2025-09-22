-- Primeiro, vamos limpar eventos de teste antigos
DELETE FROM events WHERE title LIKE '%Teste%' OR title LIKE '%Test%';

-- Criar um evento de teste simples com todos os campos obrigatórios
INSERT INTO events (
  title,
  description,
  event_type,
  event_date,
  event_time,
  location,
  price,
  max_guests,
  status,
  is_public,
  created_at
) VALUES (
  'Evento de Teste - Debug',
  'Este é um evento criado para testar o carregamento na página pública',
  'casamento',
  '2025-02-15',
  '19:00:00',
  'Local de Teste',
  150.00,
  50,
  'active',
  true,
  NOW()
);

-- Verificar se o evento foi criado
SELECT 
  id,
  title,
  event_type,
  status,
  is_public,
  event_date,
  created_at
FROM events
WHERE title = 'Evento de Teste - Debug';

-- Verificar permissões da tabela events
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'events'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;