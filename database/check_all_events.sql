-- Verificar todos os eventos na tabela
SELECT 
  id,
  title,
  status,
  is_public,
  event_date,
  created_at,
  deleted_at
FROM events
ORDER BY created_at DESC;

-- Contar eventos por status
SELECT 
  status,
  is_public,
  COUNT(*) as total
FROM events
WHERE deleted_at IS NULL
GROUP BY status, is_public;

-- Verificar eventos futuros
SELECT 
  id,
  title,
  event_date,
  status,
  is_public
FROM events
WHERE event_date >= CURRENT_DATE
  AND deleted_at IS NULL
ORDER BY event_date ASC;