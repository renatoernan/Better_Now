/**
 * Serviço de Integração com WAHA (WhatsApp HTTP API)
 * Permite envio de mensagens automáticas e testes de conexão.
 */

export interface WahaConfig {
  apiUrl: string;
  sessionName: string;
  apiKey?: string;
  enabled?: boolean;
}

export interface WahaSessionStatus {
  success: boolean;
  status: 'CONNECTED' | 'SCAN_QR_CODE' | 'WORKING' | 'STOPPED' | 'STARTING' | 'FAILED' | 'UNKNOWN';
  message: string;
  details?: any;
}

export interface SendMessageResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Limpa e formata a URL base da API
 */
export const sanitizeApiUrl = (url: string): string => {
  if (!url) return '';
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, ''); // Remove barras finais
};

/**
 * Normaliza o telefone para o formato aceito pelo WhatsApp / WAHA (ex: 5511999999999@c.us)
 */
export const normalizeWhatsAppPhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  let digits = phone.replace(/\D/g, '');

  // Se já tiver @c.us, remove para tratar
  digits = digits.replace('@c.us', '');

  // Se começar com 0, remove
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Se não tiver o DDI do Brasil (55) e tiver 10 ou 11 dígitos, adiciona 55
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  return `${digits}@c.us`;
};

/**
 * Prepara os cabeçalhos da requisição
 */
const getHeaders = (apiKey?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (apiKey && apiKey.trim() !== '') {
    headers['X-Api-Key'] = apiKey.trim();
  }

  return headers;
};

/**
 * Checa o status da sessão no servidor WAHA
 */
export const checkWahaSession = async (
  apiUrl: string,
  sessionName: string = 'default',
  apiKey?: string
): Promise<WahaSessionStatus> => {
  const baseUrl = sanitizeApiUrl(apiUrl);
  if (!baseUrl) {
    return {
      success: false,
      status: 'FAILED',
      message: 'A URL do servidor WAHA não foi configurada.',
    };
  }

  const session = sessionName.trim() || 'default';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(session)}`, {
      method: 'GET',
      headers: getHeaders(apiKey),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const status = (data.status || data.engine?.status || 'WORKING').toUpperCase();
      
      const isConnected = ['WORKING', 'CONNECTED', 'SCAN_QR_CODE', 'STARTING'].includes(status);

      return {
        success: isConnected,
        status: status as any,
        message: status === 'WORKING' || status === 'CONNECTED' 
          ? `Sessão "${session}" conectada e pronta para envio!`
          : status === 'SCAN_QR_CODE'
          ? `Sessão "${session}" aguardando leitura de QR Code.`
          : `Sessão "${session}" em status: ${status}`,
        details: data,
      };
    } else {
      // Se deu 404, talvez a sessão não exista ainda
      if (response.status === 404) {
        return {
          success: false,
          status: 'STOPPED',
          message: `Sessão "${session}" não encontrada no servidor WAHA. Verifique se o nome está correto.`,
        };
      }

      const errorText = await response.text();
      return {
        success: false,
        status: 'FAILED',
        message: `Servidor retornou erro HTTP ${response.status}: ${errorText || response.statusText}`,
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        status: 'FAILED',
        message: 'Tempo limite esgotado ao tentar conectar ao servidor WAHA (Timeout de 10s).',
      };
    }
    return {
      success: false,
      status: 'FAILED',
      message: `Não foi possível conectar ao servidor WAHA: ${err.message || 'Erro de rede'}`,
      details: err,
    };
  }
};

/**
 * Envia uma mensagem de texto simples via WAHA
 */
export const sendWahaTextMessage = async ({
  apiUrl,
  sessionName = 'default',
  apiKey,
  phone,
  text,
}: {
  apiUrl: string;
  sessionName?: string;
  apiKey?: string;
  phone: string;
  text: string;
}): Promise<SendMessageResult> => {
  const baseUrl = sanitizeApiUrl(apiUrl);
  if (!baseUrl) {
    return { success: false, message: 'URL do servidor WAHA não configurada.' };
  }

  const session = sessionName.trim() || 'default';
  const chatId = normalizeWhatsAppPhone(phone);

  if (!chatId || chatId.length < 12) {
    return { success: false, message: 'Número de WhatsApp inválido.' };
  }

  if (!text || text.trim() === '') {
    return { success: false, message: 'O texto da mensagem não pode estar vazio.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${baseUrl}/api/sendText`, {
      method: 'POST',
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        session: session,
        chatId: chatId,
        text: text.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Mensagem enviada com sucesso!',
        data,
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Falha no envio (HTTP ${response.status}): ${errorText || response.statusText}`,
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Tempo limite esgotado ao enviar mensagem.' };
    }
    return {
      success: false,
      message: `Erro ao enviar mensagem via WAHA: ${err.message || 'Erro de conexão'}`,
    };
  }
};

/**
 * Formata um template de mensagem substituindo variáveis
 */
export const formatMessageTemplate = (
  template: string,
  variables: Record<string, string | number | undefined | null>
): string => {
  let result = template || '';
  Object.entries(variables).forEach(([key, val]) => {
    const safeVal = val !== undefined && val !== null ? String(val) : '';
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, safeVal);
  });
  return result;
};
