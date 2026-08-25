import { supabase } from './lib/supabase';
import { 
  EventCoupon, 
  EventCouponUsage, 
  CouponValidationResult, 
  CreateCouponDTO, 
  UpdateCouponDTO,
  CouponStats
} from '../types/types/coupon';

/**
 * Validação de cupom no frontend para preview no checkout
 */
export const validateCouponPreview = async (params: {
  eventId: string;
  code: string;
  batchIndex?: number;
  originalAmount: number;
  clientDocument?: string;
}): Promise<CouponValidationResult> => {
  try {
    const cleanCode = params.code.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, error: 'Digite o código do cupom.' };
    }

    if (!params.eventId) {
      return { valid: false, error: 'Evento não identificado.' };
    }

    // Tentar executar via RPC oficial no Supabase
    const { data: rpcData, error: rpcError } = await supabase.rpc('app_validate_and_apply_coupon', {
      p_event_id: params.eventId,
      p_code: cleanCode,
      p_order_id: null,
      p_batch_index: params.batchIndex ?? 0,
      p_original_amount: params.originalAmount,
      p_client_document: params.clientDocument || null,
      p_record_usage: false,
    });

    if (!rpcError && rpcData) {
      return rpcData as CouponValidationResult;
    }

    // Fallback caso a RPC ainda não esteja criada no banco de dados (validação client-side contra tabela)
    const { data: coupon, error: couponError } = await supabase
      .from('app_event_coupons')
      .select('*')
      .eq('event_id', params.eventId)
      .ilike('code', cleanCode)
      .is('deleted_at', null)
      .maybeSingle();

    if (couponError || !coupon) {
      return { valid: false, error: 'Cupom não encontrado ou inválido para este evento.' };
    }

    if (!coupon.is_active) {
      return { valid: false, error: 'Este cupom foi desativado.' };
    }

    const now = new Date();
    if (new Date(coupon.valid_from) > now) {
      return { valid: false, error: 'Este cupom ainda não está ativo.' };
    }

    if (new Date(coupon.valid_until) < now) {
      return { valid: false, error: 'Este cupom expirou.' };
    }

    if (coupon.current_uses >= coupon.max_uses) {
      return { valid: false, error: 'Este cupom atingiu o limite máximo de utilizações.' };
    }

    if (coupon.batch_indexes && coupon.batch_indexes.length > 0) {
      const bIdx = params.batchIndex ?? 0;
      if (!coupon.batch_indexes.includes(bIdx)) {
        return { valid: false, error: 'Este cupom não é válido para o lote selecionado.' };
      }
    }

    if (coupon.min_order_value && params.originalAmount < coupon.min_order_value) {
      return { 
        valid: false, 
        error: `Valor mínimo do pedido para este cupom é R$ ${coupon.min_order_value.toFixed(2)}` 
      };
    }

    // Verificar restrição de CPF
    if (coupon.limit_one_per_cpf && params.clientDocument) {
      const cleanDoc = params.clientDocument.replace(/\D/g, '');
      if (cleanDoc) {
        const { count } = await supabase
          .from('app_event_coupon_usages')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .ilike('client_document', `%${cleanDoc}%`);

        if (count && count > 0) {
          return { valid: false, error: 'Você já utilizou este cupom anteriormente.' };
        }
      }
    }

    // Cálculo do desconto
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      const pct = Math.min(Number(coupon.discount_value), 100);
      discount = Number(((params.originalAmount * pct) / 100).toFixed(2));
    } else {
      discount = Math.min(Number(coupon.discount_value), params.originalAmount);
    }

    discount = Math.min(discount, params.originalAmount);
    const finalAmount = Math.max(0, Number((params.originalAmount - discount).toFixed(2)));

    return {
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      discount_applied: discount,
      original_amount: params.originalAmount,
      final_amount: finalAmount,
      current_uses: coupon.current_uses,
      max_uses: coupon.max_uses,
    };
  } catch (err: any) {
    console.error('Erro ao validar cupom:', err);
    return { valid: false, error: 'Erro ao validar cupom. Tente novamente.' };
  }
};

/**
 * Aplica o cupom definitivamente gravando na tabela de utilizações
 */
export const applyCouponOnOrder = async (params: {
  couponId: string;
  eventId: string;
  orderId?: string;
  code: string;
  batchIndex?: number;
  originalAmount: number;
  clientName?: string;
  clientDocument?: string;
  clientPhone?: string;
  clientEmail?: string;
}): Promise<CouponValidationResult> => {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('app_validate_and_apply_coupon', {
      p_event_id: params.eventId,
      p_code: params.code.trim().toUpperCase(),
      p_order_id: params.orderId || null,
      p_batch_index: params.batchIndex ?? 0,
      p_original_amount: params.originalAmount,
      p_client_name: params.clientName || null,
      p_client_document: params.clientDocument || null,
      p_client_phone: params.clientPhone || null,
      p_client_email: params.clientEmail || null,
      p_record_usage: true,
    });

    if (!rpcError && rpcData) {
      return rpcData as CouponValidationResult;
    }

    // Fallback: registrar manualmente
    const preview = await validateCouponPreview({
      eventId: params.eventId,
      code: params.code,
      batchIndex: params.batchIndex,
      originalAmount: params.originalAmount,
      clientDocument: params.clientDocument,
    });

    if (!preview.valid || !preview.coupon_id) {
      return preview;
    }

    const targetCouponId = params.couponId || preview.coupon_id;

    // Verificar se este pedido já teve o cupom contabilizado para evitar duplicações
    if (params.orderId && targetCouponId) {
      const { data: existingUsage } = await supabase
        .from('app_event_coupon_usages')
        .select('id')
        .eq('coupon_id', targetCouponId)
        .eq('order_id', params.orderId)
        .maybeSingle();

      if (existingUsage) {
        return preview;
      }
    }

    // Inserir registro na tabela de utilizações
    await supabase.from('app_event_coupon_usages').insert({
      coupon_id: targetCouponId,
      order_id: params.orderId || null,
      event_id: params.eventId,
      client_name: params.clientName || null,
      client_document: params.clientDocument || null,
      client_phone: params.clientPhone || null,
      client_email: params.clientEmail || null,
      batch_index: params.batchIndex ?? 0,
      discount_applied: preview.discount_applied || 0,
      original_amount: params.originalAmount,
      final_amount: preview.final_amount || 0,
    });

    // Incrementar e sincronizar a contagem de usos do cupom
    try {
      const { count: realUsageCount } = await supabase
        .from('app_event_coupon_usages')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', targetCouponId);

      const { data: c } = await supabase
        .from('app_event_coupons')
        .select('current_uses')
        .eq('id', targetCouponId)
        .single();

      const newUses = Math.max(realUsageCount || 0, (c?.current_uses || 0) + 1);

      await supabase
        .from('app_event_coupons')
        .update({ 
          current_uses: newUses,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetCouponId);

      preview.current_uses = newUses;
    } catch (incErr) {
      console.warn('Aviso ao sincronizar usos do cupom:', incErr);
    }

    return preview;
  } catch (err: any) {
    console.error('Erro ao aplicar cupom na ordem:', err);
    return { valid: false, error: 'Erro ao registrar cupom no pedido.' };
  }
};

/**
 * Listar cupons para o painel admin (com filtro opcional por evento)
 */
export const getCoupons = async (eventId?: string): Promise<EventCoupon[]> => {
  let query = supabase
    .from('app_event_coupons')
    .select(`
      *,
      event:app_events(id, title, event_date)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (eventId && eventId !== 'all') {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar cupons:', error);
    throw error;
  }

  const couponsList = (data || []) as EventCoupon[];

  // Reconciliar contagem real de usos a partir da tabela app_event_coupon_usages
  try {
    const { data: usagesData } = await supabase
      .from('app_event_coupon_usages')
      .select('coupon_id');

    if (usagesData && usagesData.length > 0) {
      const usageCountMap: Record<string, number> = {};
      usagesData.forEach(u => {
        if (u.coupon_id) {
          usageCountMap[u.coupon_id] = (usageCountMap[u.coupon_id] || 0) + 1;
        }
      });

      couponsList.forEach(coupon => {
        const realCount = usageCountMap[coupon.id] ?? 0;
        if (realCount > (coupon.current_uses || 0)) {
          coupon.current_uses = realCount;
          // Sincronizar em background
          supabase
            .from('app_event_coupons')
            .update({ current_uses: realCount })
            .eq('id', coupon.id)
            .then(() => {});
        }
      });
    }
  } catch (reconcileErr) {
    console.warn('Aviso ao sincronizar contagem de usos dos cupons:', reconcileErr);
  }

  return couponsList;
};

/**
 * Obter utilizações de um cupom específico
 */
export const getCouponUsages = async (couponId: string): Promise<EventCouponUsage[]> => {
  const { data, error } = await supabase
    .from('app_event_coupon_usages')
    .select('*')
    .eq('coupon_id', couponId)
    .order('used_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar utilizações do cupom:', error);
    throw error;
  }

  return (data || []) as EventCouponUsage[];
};

/**
 * Criar um novo cupom
 */
export const createCoupon = async (dto: CreateCouponDTO): Promise<EventCoupon> => {
  const cleanCode = dto.code.trim().toUpperCase();
  
  const payload = {
    event_id: dto.event_id,
    code: cleanCode,
    description: dto.description || null,
    discount_type: dto.discount_type,
    discount_value: dto.discount_value,
    max_uses: dto.max_uses,
    current_uses: 0,
    limit_one_per_cpf: dto.limit_one_per_cpf ?? true,
    batch_indexes: dto.batch_indexes && dto.batch_indexes.length > 0 ? dto.batch_indexes : null,
    valid_from: dto.valid_from,
    valid_until: dto.valid_until,
    min_order_value: dto.min_order_value || 0,
    is_active: dto.is_active ?? true,
  };

  const { data, error } = await supabase
    .from('app_event_coupons')
    .insert(payload)
    .select(`
      *,
      event:app_events(id, title, event_date)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Já existe um cupom com o código "${cleanCode}" para este evento.`);
    }
    console.error('Erro ao criar cupom:', error);
    throw error;
  }

  return data as EventCoupon;
};

/**
 * Atualizar um cupom existente
 */
export const updateCoupon = async (id: string, dto: UpdateCouponDTO): Promise<EventCoupon> => {
  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (dto.event_id !== undefined) payload.event_id = dto.event_id;
  if (dto.code !== undefined) payload.code = dto.code.trim().toUpperCase();
  if (dto.description !== undefined) payload.description = dto.description;
  if (dto.discount_type !== undefined) payload.discount_type = dto.discount_type;
  if (dto.discount_value !== undefined) payload.discount_value = dto.discount_value;
  if (dto.max_uses !== undefined) payload.max_uses = dto.max_uses;
  if (dto.limit_one_per_cpf !== undefined) payload.limit_one_per_cpf = dto.limit_one_per_cpf;
  if (dto.batch_indexes !== undefined) {
    payload.batch_indexes = dto.batch_indexes && dto.batch_indexes.length > 0 ? dto.batch_indexes : null;
  }
  if (dto.valid_from !== undefined) payload.valid_from = dto.valid_from;
  if (dto.valid_until !== undefined) payload.valid_until = dto.valid_until;
  if (dto.min_order_value !== undefined) payload.min_order_value = dto.min_order_value;
  if (dto.is_active !== undefined) payload.is_active = dto.is_active;

  const { data, error } = await supabase
    .from('app_event_coupons')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      event:app_events(id, title, event_date)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Já existe outro cupom com este código para o evento.`);
    }
    console.error('Erro ao atualizar cupom:', error);
    throw error;
  }

  return data as EventCoupon;
};

/**
 * Exclusão lógica do cupom
 */
export const deleteCoupon = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('app_event_coupons')
    .update({ 
      deleted_at: new Date().toISOString(),
      is_active: false 
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir cupom:', error);
    throw error;
  }

  return true;
};

/**
 * Alternar status ativo/inativo
 */
export const toggleCouponStatus = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from('app_event_coupons')
    .update({ 
      is_active: !currentStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao alterar status do cupom:', error);
    throw error;
  }

  return !currentStatus;
};

/**
 * Calcular estatísticas gerais de cupons
 */
export const calculateCouponStats = (coupons: EventCoupon[], usages: EventCouponUsage[] = []): CouponStats => {
  const now = new Date();
  const activeCoupons = coupons.filter(c => 
    c.is_active && 
    !c.deleted_at && 
    new Date(c.valid_until) >= now && 
    new Date(c.valid_from) <= now &&
    c.current_uses < c.max_uses
  ).length;

  const totalUsages = coupons.reduce((acc, c) => acc + (c.current_uses || 0), 0);
  const totalDiscountGiven = usages.reduce((acc, u) => acc + (Number(u.discount_applied) || 0), 0);

  return {
    totalCoupons: coupons.length,
    activeCoupons,
    totalUsages,
    totalDiscountGiven,
  };
};
