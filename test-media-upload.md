# Teste de Upload de Mídia - Correções Implementadas

## Problemas Identificados e Corrigidos:

### 1. Coluna 'is_cover' ausente na tabela event_photos
- **Problema**: PGRST204 - Could not find the 'is_cover' column
- **Solução**: Criada migração SQL para adicionar a coluna 'is_cover' com valor padrão FALSE
- **Status**: ✅ Corrigido

### 2. Função uploadEventPhoto com parâmetros incorretos
- **Problema**: Função esperava URL mas recebia File object
- **Solução**: Modificada para fazer upload do arquivo para storage primeiro, depois inserir no banco
- **Status**: ✅ Corrigido

### 3. Bucket 'event-media' ausente no Supabase Storage
- **Problema**: Tentativa de upload para bucket inexistente
- **Solução**: Criado bucket 'event-media' com suporte a imagens e vídeos
- **Status**: ✅ Corrigido

## Funcionalidades Implementadas:

1. **Upload de Arquivos**: Agora faz upload correto para o storage
2. **Coluna is_cover**: Permite marcar fotos como capa do evento
3. **Suporte a Vídeos**: Bucket configurado para aceitar vídeos
4. **Permissões**: Roles anon e authenticated têm acesso à tabela

## Para Testar:

1. Acesse a galeria de eventos
2. Clique em "Adicionar Mídia"
3. Selecione uma imagem ou vídeo
4. Adicione uma legenda (opcional)
5. Clique em "Enviar"

**Resultado Esperado**: Upload bem-sucedido sem erros PGRST204 ou 400 Bad Request.