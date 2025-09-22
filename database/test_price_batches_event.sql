-- Criar evento de teste com price_batches para verificar como está sendo salvo
INSERT INTO events (
  title,
  description,
  event_type,
  event_date,
  event_time,
  location,
  max_guests,
  current_guests,
  price_batches,
  status,
  is_public,
  created_at,
  updated_at
) VALUES (
  'Evento Teste Price Batches',
  'Evento para testar o carregamento de price_batches',
  'casamento',
  '2025-02-15',
  '19:00:00',
  'Local de Teste',
  100,
  0,
  '[{"name":"1º Lote","price":150.00,"description":"Primeiros 50 ingressos","deadline":"2025-01-15"},{"name":"2º Lote","price":200.00,"description":"Próximos 30 ingressos","deadline":"2025-02-01"}]'::jsonb,
  'active',
  true,
  NOW(),
  NOW()
);

-- Verificar como o evento foi salvo
SELECT 
  id,
  title,
  price_batches,
  pg_typeof(price_batches) as price_batches_type
FROM events 
WHERE title = 'Evento Teste Price Batches';

-- Verificar todos os eventos com price_batches não nulo
SELECT 
  id,
  title,
  price_batches,
  pg_typeof(price_batches) as price_batches_type
FROM events 
WHERE price_batches IS NOT NULL
ORDER BY created_at DESC;