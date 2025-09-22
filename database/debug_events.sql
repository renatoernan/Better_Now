-- Query para verificar eventos existentes
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

-- Query para contar eventos por status
SELECT 
    status,
    is_public,
    COUNT(*) as count
FROM events 
WHERE deleted_at IS NULL
GROUP BY status, is_public;