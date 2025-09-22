-- Verificar se o evento de teste foi criado
SELECT 
  id,
  title,
  event_date,
  status,
  is_public,
  event_type,
  created_at
FROM events 
WHERE title = 'Evento de Teste - Debug';

-- Verificar todos os eventos com status 'ativo' e is_public = true
SELECT 
  id,
  title,
  event_date,
  status,
  is_public,
  event_type
FROM events 
WHERE status = 'ativo' AND is_public = true;

-- Verificar todos os eventos independente do status
SELECT 
  id,
  title,
  event_date,
  status,
  is_public,
  event_type
FROM events 
ORDER BY created_at DESC
LIMIT 5;