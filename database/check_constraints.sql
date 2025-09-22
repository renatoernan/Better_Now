-- Verificar constraints da tabela admin_users
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'admin_users'::regclass;

-- Verificar a estrutura da tabela admin_users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'admin_users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;