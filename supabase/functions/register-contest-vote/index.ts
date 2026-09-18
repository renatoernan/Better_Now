import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Erro de regra de negócio: vira mensagem legível no tablet. */
const reject = (code: string, message: string, status = 422) =>
  json({ ok: false, code, message }, status);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      contest_id,
      entry_id,
      qr_code_hash,
      ticket_id,
      client_vote_id,
      collected_by,
    } = await req.json();

    if (!contest_id || !entry_id || (!qr_code_hash && !ticket_id)) {
      return reject("INVALID_INPUT", "Dados incompletos para registrar o voto.", 400);
    }

    // 1. Concurso precisa estar com votação aberta
    const { data: contest } = await supabase
      .from("app_event_contests")
      .select("id, event_id, status, voting_opens_at, voting_closes_at, require_checkin, allow_self_vote, deleted_at")
      .eq("id", contest_id)
      .maybeSingle();

    if (!contest || contest.deleted_at) {
      return reject("CONTEST_NOT_FOUND", "Concurso não encontrado.", 404);
    }
    if (contest.status !== "voting") {
      return reject("VOTING_CLOSED", "A votação deste concurso não está aberta.");
    }

    const now = Date.now();
    if (contest.voting_opens_at && now < Date.parse(contest.voting_opens_at)) {
      return reject("VOTING_NOT_STARTED", "A votação ainda não começou.");
    }
    if (contest.voting_closes_at && now > Date.parse(contest.voting_closes_at)) {
      return reject("VOTING_ENDED", "A votação já foi encerrada.");
    }

    // 2. Candidatura precisa ser deste concurso e estar ativa
    const { data: entry } = await supabase
      .from("app_contest_entries")
      .select("id, contest_id, status, participant_ticket_id, participant_person_id")
      .eq("id", entry_id)
      .maybeSingle();

    if (!entry || entry.contest_id !== contest_id) {
      return reject("ENTRY_NOT_IN_CONTEST", "Esta foto não concorre neste concurso.");
    }
    if (entry.status !== "active") {
      return reject("ENTRY_DISQUALIFIED", "Esta candidatura foi desclassificada.");
    }

    // 3. Ingresso: identificado pelo QR lido no tablet
    let ticketQuery = supabase
      .from("app_event_tickets")
      .select("id, event_id, client_id, status, used_at");

    ticketQuery = qr_code_hash
      ? ticketQuery.eq("qr_code_hash", qr_code_hash)
      : ticketQuery.eq("id", ticket_id);

    const { data: ticket } = await ticketQuery.maybeSingle();

    if (!ticket) {
      return reject("TICKET_NOT_FOUND", "Ingresso não reconhecido.", 404);
    }
    if (ticket.event_id !== contest.event_id) {
      return reject("TICKET_WRONG_EVENT", "Este ingresso é de outro evento.");
    }
    if (ticket.status === "canceled") {
      return reject("TICKET_CANCELED", "Este ingresso foi cancelado.");
    }
    if (contest.require_checkin && !ticket.used_at) {
      return reject("CHECKIN_REQUIRED", "É preciso fazer o check-in antes de votar.");
    }

    // 4. Voto em si mesmo
    if (!contest.allow_self_vote) {
      const sameTicket = entry.participant_ticket_id && entry.participant_ticket_id === ticket.id;
      const samePerson = entry.participant_person_id && ticket.client_id
        && entry.participant_person_id === ticket.client_id;
      if (sameTicket || samePerson) {
        return reject("SELF_VOTE", "Não é permitido votar em si mesmo neste concurso.");
      }
    }

    // 5. Já votou? Consulta antecipada dá mensagem melhor que erro de constraint,
    // mas quem garante a unicidade é a constraint no passo 6.
    const { data: existing } = await supabase
      .from("app_contest_votes")
      .select("id, entry_id, client_vote_id")
      .eq("contest_id", contest_id)
      .eq("ticket_id", ticket.id)
      .maybeSingle();

    if (existing) {
      // Reenvio da fila local: mesma tentativa, não é voto novo.
      if (client_vote_id && existing.client_vote_id === client_vote_id) {
        return json({ ok: true, duplicate: false, already_synced: true, vote_id: existing.id });
      }
      return reject("ALREADY_VOTED", "Este ingresso já votou neste concurso.", 409);
    }

    const forwarded = req.headers.get("x-forwarded-for") || "";
    const { data: vote, error: insertError } = await supabase
      .from("app_contest_votes")
      .insert([{
        contest_id,
        entry_id,
        ticket_id: ticket.id,
        voting_mode: "kiosk",
        collected_by: collected_by || null,
        client_vote_id: client_vote_id || null,
        ip_address: forwarded.split(",")[0].trim() || null,
        user_agent: req.headers.get("user-agent"),
      }])
      .select("id")
      .single();

    if (insertError) {
      // 23505: corrida entre dois tablets no mesmo ingresso, ou reenvio simultâneo
      if (insertError.code === "23505") {
        return reject("ALREADY_VOTED", "Este ingresso já votou neste concurso.", 409);
      }
      throw insertError;
    }

    return json({ ok: true, vote_id: vote.id });
  } catch (err) {
    console.error("register-contest-vote:", err);
    return json({ ok: false, code: "INTERNAL", message: "Erro ao registrar o voto." }, 500);
  }
});
