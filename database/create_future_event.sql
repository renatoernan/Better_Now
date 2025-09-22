-- Deletar eventos de teste anteriores
DELETE FROM events WHERE title LIKE '%Teste%' OR title LIKE '%Debug%' OR title LIKE '%Funcional%';

-- Criar um evento com data futura
INSERT INTO events (
    title,
    description,
    event_type,
    status,
    is_public,
    event_date,
    event_time,
    location,
    price,
    max_guests,
    current_guests,
    created_at,
    updated_at
) VALUES (
    'Workshop de Desenvolvimento Web',
    'Aprenda as melhores práticas de desenvolvimento web moderno com React, TypeScript e Supabase.',
    'workshop',
    'active',
    true,
    '2025-02-15',
    '14:00:00',
    'Centro de Tecnologia - São Paulo, SP',
    199.90,
    30,
    5,
    NOW(),
    NOW()
);

-- Criar outro evento
INSERT INTO events (
    title,
    description,
    event_type,
    status,
    is_public,
    event_date,
    event_time,
    location,
    price,
    max_guests,
    current_guests,
    created_at,
    updated_at
) VALUES (
    'Conferência de Inovação',
    'Descubra as últimas tendências em tecnologia e inovação com palestrantes renomados.',
    'conference',
    'active',
    true,
    '2025-03-20',
    '09:00:00',
    'Centro de Convenções - Rio de Janeiro, RJ',
    299.00,
    100,
    15,
    NOW(),
    NOW()
);

-- Verificar se foram criados
SELECT 
    id,
    title,
    status,
    is_public,
    event_date,
    event_time,
    location,
    price
FROM events 
WHERE status = 'active' AND is_public = true AND deleted_at IS NULL
ORDER BY created_at DESC;