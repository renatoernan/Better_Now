-- Verificar se existem eventos na tabela
SELECT 
    id,
    title,
    status,
    is_public,
    deleted_at,
    created_at
FROM events 
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Contar total de eventos por status
SELECT 
    status,
    is_public,
    COUNT(*) as total
FROM events 
WHERE deleted_at IS NULL
GROUP BY status, is_public;

-- Verificar se existe o evento de teste que criamos
SELECT *
FROM events 
WHERE title = 'Evento de Teste - Debug';