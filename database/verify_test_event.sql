-- Verificar se o evento de teste com price_batches foi criado
SELECT 
    id,
    title,
    price_batches,
    jsonb_typeof(price_batches) as price_batches_type,
    jsonb_array_length(price_batches) as batches_count
FROM events 
WHERE title LIKE '%Evento de Teste%'
ORDER BY created_at DESC
LIMIT 5;

-- Verificar estrutura dos price_batches
SELECT 
    id,
    title,
    jsonb_pretty(price_batches) as formatted_price_batches
FROM events 
WHERE price_batches IS NOT NULL 
    AND jsonb_typeof(price_batches) = 'array'
    AND jsonb_array_length(price_batches) > 0
ORDER BY created_at DESC
LIMIT 3;