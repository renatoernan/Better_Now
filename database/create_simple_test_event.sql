-- Deletar eventos de teste anteriores
DELETE FROM events WHERE title LIKE '%Teste%' OR title LIKE '%Debug%';

-- Criar um evento de teste simples
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
    'Evento de Teste Funcional',
    'Este é um evento de teste para verificar se a funcionalidade está funcionando corretamente.',
    'workshop',
    'active',
    true,
    '2024-12-31',
    '19:00:00',
    'Centro de Eventos - São Paulo',
    150.00,
    50,
    0,
    NOW(),
    NOW()
);

-- Verificar se foi criado
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
WHERE title = 'Evento de Teste Funcional';