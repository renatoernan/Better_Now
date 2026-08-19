-- Adicionar configurações de integração do WAHA (WhatsApp HTTP API) na tabela app_settings
-- Migration: 033_add_waha_settings

INSERT INTO app_settings (key, value, description, created_at, updated_at) VALUES
('waha_api_url', '""', 'URL Base do servidor WAHA (WhatsApp HTTP API)', NOW(), NOW()),
('waha_session_name', '"default"', 'Nome da sessão ativa no WAHA', NOW(), NOW()),
('waha_api_key', '""', 'Chave de segurança/API Key para autenticação no WAHA (cabeçalho X-Api-Key)', NOW(), NOW()),
('waha_enabled', 'true', 'Habilita ou desabilita o envio automático de mensagens via WhatsApp', NOW(), NOW()),
('waha_msg_order_created', '"Olá, {cliente}! Recebemos seu pedido #{numero_pedido} para o evento *{evento}*.\n\n💰 *Total:* {total}\n⏳ *Status:* Aguardando Pagamento\n\nAssim que o pagamento for confirmado, você receberá seus ingressos por aqui!"', 'Modelo de mensagem para pedido criado', NOW(), NOW()),
('waha_msg_order_confirmed', '"🎉 Parabéns, {cliente}! Seu pagamento para o evento *{evento}* foi confirmado com sucesso!\n\n🎟️ *Quantidade de Ingressos:* {quantidade}\n📅 *Data:* {data_evento}\n📍 *Local:* {local_evento}\n\nVocê pode acessar seus ingressos a qualquer momento através do link: {link_acesso}"', 'Modelo de mensagem para pagamento confirmado', NOW(), NOW()),
('waha_msg_order_cancelled', '"Olá, {cliente}. Informamos que seu pedido #{numero_pedido} para o evento *{evento}* foi cancelado.\n\nSe você tiver alguma dúvida, entre em contato conosco."', 'Modelo de mensagem para pedido cancelado', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar registros inseridos
SELECT key, value, description FROM app_settings 
WHERE key LIKE 'waha_%'
ORDER BY key;
