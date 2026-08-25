-- Adicionar configurações do Servidor de E-mail (IMAP, POP3 e SMTP com SSL/TLS) na tabela app_settings
-- Migration: 035_add_email_settings

INSERT INTO app_settings (key, value, description, created_at, updated_at) VALUES
('email_smtp_user', '"betternow@cesire.com.br"', 'Nome de usuário da conta de e-mail', NOW(), NOW()),
('email_smtp_password', '""', 'Senha da conta de e-mail para autenticação', NOW(), NOW()),
('email_incoming_host', '"mail.cesire.com.br"', 'Endereço do servidor de entrada (IMAP/POP3)', NOW(), NOW()),
('email_imap_port', '993', 'Porta do servidor de entrada IMAP (SSL/TLS)', NOW(), NOW()),
('email_pop3_port', '995', 'Porta do servidor de entrada POP3 (SSL/TLS)', NOW(), NOW()),
('email_outgoing_host', '"mail.cesire.com.br"', 'Endereço do servidor de saída SMTP', NOW(), NOW()),
('email_smtp_port', '465', 'Porta do servidor de saída SMTP (SSL/TLS)', NOW(), NOW()),
('email_from_name', '"Better Now"', 'Nome de exibição do remetente nos e-mails', NOW(), NOW()),
('email_from_address', '"betternow@cesire.com.br"', 'Endereço de e-mail do remetente (From)', NOW(), NOW()),
('email_security', '"ssl_tls"', 'Tipo de criptografia de segurança (ssl_tls, starttls, none)', NOW(), NOW()),
('email_auth_required', 'true', 'Define se o envio e recebimento exigem autenticação (SMTP/IMAP Auth)', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar registros inseridos/atualizados
SELECT key, value, description FROM app_settings 
WHERE key LIKE 'email_%'
ORDER BY key;
