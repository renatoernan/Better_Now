import { useState, useEffect, useCallback } from 'react';
import { 
  EventCoupon, 
  EventCouponUsage, 
  CreateCouponDTO, 
  UpdateCouponDTO, 
  CouponStats 
} from '../../types/types/coupon';
import * as couponService from '../../services/couponService';
import { toast } from 'sonner';

export const useEventCoupons = (initialEventId?: string) => {
  const [coupons, setCoupons] = useState<EventCoupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || 'all');
  const [stats, setStats] = useState<CouponStats>({
    totalCoupons: 0,
    activeCoupons: 0,
    totalUsages: 0,
    totalDiscountGiven: 0,
  });

  const fetchCoupons = useCallback(async (eventId?: string) => {
    setLoading(true);
    try {
      const targetEventId = eventId !== undefined ? eventId : selectedEventId;
      const syncResult = await couponService.syncAndBackfillCouponUsages(targetEventId);
      const data = await couponService.getCoupons(targetEventId);
      setCoupons(data);

      const calculatedStats = couponService.calculateCouponStats(data, [], syncResult.totalDiscount);
      setStats(calculatedStats);
    } catch (err: any) {
      console.error('Erro ao carregar cupons:', err);
      toast.error('Erro ao carregar cupons de desconto.');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchCoupons(selectedEventId);
  }, [selectedEventId, fetchCoupons]);

  const handleCreateCoupon = async (dto: CreateCouponDTO): Promise<EventCoupon> => {
    try {
      const newCoupon = await couponService.createCoupon(dto);
      toast.success(`Cupom "${newCoupon.code}" criado com sucesso!`);
      await fetchCoupons(selectedEventId);
      return newCoupon;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar cupom.');
      throw err;
    }
  };

  const handleUpdateCoupon = async (id: string, dto: UpdateCouponDTO): Promise<EventCoupon> => {
    try {
      const updated = await couponService.updateCoupon(id, dto);
      toast.success(`Cupom "${updated.code}" atualizado com sucesso!`);
      await fetchCoupons(selectedEventId);
      return updated;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar cupom.');
      throw err;
    }
  };

  const handleDeleteCoupon = async (id: string): Promise<boolean> => {
    try {
      await couponService.deleteCoupon(id);
      toast.success('Cupom excluído com sucesso!');
      await fetchCoupons(selectedEventId);
      return true;
    } catch (err: any) {
      toast.error('Erro ao excluir cupom.');
      throw err;
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean): Promise<boolean> => {
    try {
      const newStatus = await couponService.toggleCouponStatus(id, currentStatus);
      toast.success(newStatus ? 'Cupom ativado com sucesso!' : 'Cupom desativado com sucesso!');
      await fetchCoupons(selectedEventId);
      return newStatus;
    } catch (err: any) {
      toast.error('Erro ao alterar status do cupom.');
      throw err;
    }
  };

  const handleFetchUsages = async (couponId: string): Promise<EventCouponUsage[]> => {
    try {
      return await couponService.getCouponUsages(couponId);
    } catch (err: any) {
      toast.error('Erro ao carregar histórico de utilização do cupom.');
      return [];
    }
  };

  return {
    coupons,
    loading,
    stats,
    selectedEventId,
    setSelectedEventId,
    refetch: fetchCoupons,
    createCoupon: handleCreateCoupon,
    updateCoupon: handleUpdateCoupon,
    deleteCoupon: handleDeleteCoupon,
    toggleCouponActive: handleToggleActive,
    fetchCouponUsages: handleFetchUsages,
  };
};

export default useEventCoupons;
