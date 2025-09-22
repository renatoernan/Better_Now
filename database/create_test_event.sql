-- Inserir evento de teste
INSERT INTO events (
    title,
    description,
    event_type,
    event_date,
    event_time,
    location,
    max_guests,
    current_guests,
    price,
    status,
    is_public,
    category,
    contact_email,
    contact_phone
) VALUES (
    'Evento de Teste - Debug',
    'Este é um evento criado para testar o carregamento da página de detalhes.',
    'Workshop',
    '2024-12-31',
    '19:00:00',
    'Centro de Convenções - São Paulo',
    100,
    25,
    150.00,
    'active',
    true,
    'tecnologia',
    'contato@betternow.com',
    '(11) 99999-9999'
);

-- Verificar se foi inserido
SELECT 
    id,
    title,
    status,
    is_public,
    event_date,
    created_at
FROM events 
WHERE title = 'Evento de Teste - Debug';