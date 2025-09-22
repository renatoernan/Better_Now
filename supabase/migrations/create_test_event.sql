-- Inserir evento de teste para verificar a funcionalidade
INSERT INTO events (
  title,
  description,
  event_type,
  event_date,
  event_time,
  location,
  max_guests,
  price,
  status,
  is_public,
  category,
  contact_email,
  image_url
) VALUES (
  'Evento de Teste - Workshop de Tecnologia',
  'Um workshop incrível sobre as últimas tendências em tecnologia. Venha aprender e se conectar com outros profissionais da área.',
  'workshop',
  '2024-02-15',
  '14:00:00',
  'Centro de Convenções - Sala A',
  50,
  99.90,
  'active',
  true,
  'Tecnologia',
  'contato@evento.com',
  'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20technology%20workshop%20event%20banner%20with%20laptops%20and%20people%20learning%20professional%20blue%20theme&image_size=landscape_16_9'
);

-- Inserir mais um evento para testar múltiplos cards
INSERT INTO events (
  title,
  description,
  event_type,
  event_date,
  event_time,
  location,
  max_guests,
  price,
  status,
  is_public,
  category,
  contact_email,
  image_url
) VALUES (
  'Conferência de Inovação 2024',
  'A maior conferência de inovação do ano! Palestrantes renomados, networking e muito aprendizado.',
  'conferencia',
  '2024-03-20',
  '09:00:00',
  'Auditório Principal - Centro Empresarial',
  200,
  149.90,
  'active',
  true,
  'Negócios',
  'info@inovacao2024.com',
  'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=innovation%20conference%202024%20business%20event%20banner%20with%20speakers%20and%20audience%20modern%20design&image_size=landscape_16_9'
);