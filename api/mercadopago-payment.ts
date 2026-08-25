export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const accessToken =
      process.env.VITE_MERCADOPAGO_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN ||
      'APP_USR-1264360358076296-081717-ffb3d55789b1665111c7d2c6e33a856f-68352240';

    if (!accessToken) {
      res.status(500).json({ error: 'Token do Mercado Pago não configurado no servidor.' });
      return;
    }

    const { paymentBody, idempotencyKey } = req.body || {};

    if (!paymentBody) {
      res.status(400).json({ error: 'Corpo do pagamento não fornecido.' });
      return;
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey || `mp-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const mpData = await mpRes.json();
    res.status(mpRes.status).json(mpData);
  } catch (error: any) {
    console.error('Erro na função serverless do Mercado Pago:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao processar pagamento.' });
  }
}
