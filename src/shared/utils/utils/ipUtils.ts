/**
 * Utilitário para captura do endereço de IP do cliente para auditoria e segurança
 */

let cachedIp: string | null = null;

export const getClientIpAddress = async (): Promise<string> => {
  if (cachedIp) return cachedIp;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch (err) {
    // Silencioso se offline ou bloqueado por adblock
  }

  return '127.0.0.1';
};
