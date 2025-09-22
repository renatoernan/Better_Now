-- Verificar registros duplicados na tabela app_settings
SELECT 
    key, 
    COUNT(*) as count,
    array_agg(id) as ids,
    array_agg(value) as values
FROM app_settings 
GROUP BY key 
HAVING COUNT(*) > 1;

-- Verificar todas as chaves relacionadas a contato
SELECT key, value, id, created_at, updated_at
FROM app_settings 
WHERE key IN ('contact_email', 'phone', 'address', 'social_instagram', 'social_whatsapp')
ORDER BY key, created_at;

-- Verificar total de registros
SELECT COUNT(*) as total_records FROM app_settings;