import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar requisição OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password,
      from_name,
      from_address,
      to,
      subject,
      text,
      html,
      security,
      auth_required = true,
    } = body;

    // Validação básica dos dados obrigatórios
    if (!smtp_host || !smtp_user || !to) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Parâmetros obrigatórios ausentes: 'smtp_host', 'smtp_user' e 'to' são requeridos.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const port = Number(smtp_port) || 465;
    const isSecure = port === 465 || security === "ssl_tls";

    // Configuração do transporter nodemailer
    const transportConfig: any = {
      host: smtp_host,
      port: port,
      secure: isSecure, // true para portas SSL diretas (465), false para STARTTLS (587, etc.)
      connectionTimeout: 15000, // 15s timeout
      tls: {
        rejectUnauthorized: false, // Permite certificados válidos ou compartilhados sem bloqueio
      },
    };

    if (auth_required) {
      transportConfig.auth = {
        user: smtp_user,
        pass: smtp_password || "",
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Formatar remetente
    const sender = from_name
      ? `"${from_name}" <${from_address || smtp_user}>`
      : from_address || smtp_user;

    const emailSubject = subject || "Teste de Conexão - Servidor de E-mail Better Now";
    const emailText =
      text ||
      `Olá!\n\nEste é um e-mail de teste enviado pelo sistema Better Now.\n\nServidor SMTP: ${smtp_host}:${port}\nUsuário: ${smtp_user}\nData/Hora: ${new Date().toLocaleString("pt-BR")}`;

    let emailHtml = html;
    if (!emailHtml) {
      if (text) {
        const paragraphs = text
          .split("\n")
          .filter((p: string) => p.trim() !== "")
          .map((p: string) => `<p style="margin: 0 0 12px 0; color: #334155; line-height: 1.6; font-size: 14px;">${p}</p>`)
          .join("");

        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              ${paragraphs}
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Sistema Better Now - Gestão de Eventos e Ingressos</p>
          </div>
        `.trim();
      } else {
        emailHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0284c7; margin-top: 0;">🎉 Teste de Conexão com Sucesso!</h2>
          <p>Olá,</p>
          <p>Este é um e-mail de teste disparado pelo sistema <b>Better Now</b> para validar a conexão e entrega do seu servidor de e-mail.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 13px; color: #334155; margin: 20px 0;">
            <p style="margin: 4px 0;"><b>Servidor SMTP:</b> ${smtp_host}:${port}</p>
            <p style="margin: 4px 0;"><b>Conta Remetente:</b> ${smtp_user}</p>
            <p style="margin: 4px 0;"><b>Segurança:</b> ${isSecure ? "SSL/TLS (Porta 465)" : "STARTTLS / Padrão"}</p>
            <p style="margin: 4px 0;"><b>Data/Hora do Disparo:</b> ${new Date().toLocaleString("pt-BR")}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Sistema Better Now - Gestão de Eventos e Ingressos</p>
        </div>`;
      }
    }

    const replyToAddress = from_address || smtp_user;

    const info = await transporter.sendMail({
      from: sender,
      to: to,
      replyTo: replyToAddress,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      headers: {
        'X-Mailer': 'Better Now Event Platform',
        'X-Priority': '1',
        'Importance': 'high',
      },
    });

    console.log("E-mail enviado com sucesso:", info.messageId, "Response:", info.response);

    return new Response(
      JSON.stringify({
        success: true,
        message: `E-mail enviado com sucesso para ${to}!`,
        messageId: info.messageId,
        response: info.response,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao enviar e-mail via SMTP:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro desconhecido ao conectar e autenticar no servidor SMTP.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
