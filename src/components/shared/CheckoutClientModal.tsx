import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Phone, Mail, FileText, MapPin, Globe, CheckCircle2, 
  Loader2, Sparkles, UserPlus, Briefcase, Building2, Calendar, 
  Ticket, ArrowLeft, ArrowRight, Copy, Check
} from 'lucide-react';
import { PhoneInput } from '../ui/PhoneInput';
import { CheckoutFieldConfig } from '../../shared/types/types/event';
import { supabase } from '../../shared/services/lib/supabase';
import { validateCPF, formatCPF, formatCEP, fetchAddressByCEP } from '../../shared/utils/utils/cpfUtils';
import { toast } from 'sonner';

export interface CheckoutClientData {
  nome: string;
  whatsapp: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  documento?: string;
  is_foreign?: boolean;
  foreign_document?: string;
  apelido?: string;
  data_nascimento?: string;
  profissao?: string;
  empresa?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  notes?: string;
  person_id?: string | null;
  client_id?: string | null;
}

interface CheckoutClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (buyerData: CheckoutClientData, attendeesData: CheckoutClientData[], buyerPersonId?: string | null) => void;
  checkoutFields?: CheckoutFieldConfig[];
  quantity?: number;
  initialPhone?: string;
  initialName?: string;
  loading?: boolean;
  eventTitle?: string;
}

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const createEmptyAttendee = (name = '', phone = ''): CheckoutClientData => ({
  nome: name,
  whatsapp: phone,
  telefone: '',
  email: '',
  cpf: '',
  documento: '',
  is_foreign: false,
  foreign_document: '',
  apelido: '',
  data_nascimento: '',
  profissao: '',
  empresa: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
  notes: '',
});

export const CheckoutClientModal: React.FC<CheckoutClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  checkoutFields = [],
  quantity = 1,
  initialPhone = '',
  initialName = '',
  loading = false,
  eventTitle
}) => {
  const actualQty = Math.max(1, quantity);
  const [activeIndex, setActiveIndex] = useState(0);
  const [attendees, setAttendees] = useState<CheckoutClientData[]>([
    createEmptyAttendee(initialName, initialPhone)
  ]);

  const [errorsList, setErrorsList] = useState<{ [key: string]: string }[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [autoFilledMap, setAutoFilledMap] = useState<{ [index: number]: boolean }>({});
  const [cpfConsultedMap, setCpfConsultedMap] = useState<{ [index: number]: boolean }>({});
  const [isExistingClientMap, setIsExistingClientMap] = useState<{ [index: number]: boolean }>({});

  // Inicializar array de participantes baseado na quantidade
  useEffect(() => {
    if (isOpen) {
      setAttendees(prev => {
        const next: CheckoutClientData[] = [];
        for (let i = 0; i < actualQty; i++) {
          if (i === 0) {
            next.push(prev[0] ? { ...prev[0], nome: prev[0].nome || initialName, whatsapp: prev[0].whatsapp || initialPhone } : createEmptyAttendee(initialName, initialPhone));
          } else if (prev[i]) {
            next.push(prev[i]);
          } else {
            next.push(createEmptyAttendee());
          }
        }
        return next;
      });

      setActiveIndex(0);
      setErrorsList(Array(actualQty).fill({}));
      setAutoFilledMap({});
      setCpfConsultedMap({});
      setIsExistingClientMap({});
    }
  }, [isOpen, actualQty, initialPhone, initialName]);

  // Lista normalizada de campos configurados
  const enabledFields = useMemo(() => {
    return checkoutFields.length > 0 
      ? checkoutFields.filter(f => f.enabled)
      : [
          { field: 'cpf', label: 'CPF / Documento', enabled: true, required: true, type: 'cpf' as const },
          { field: 'nome', label: 'Nome Completo', enabled: true, required: true, type: 'text' as const },
          { field: 'whatsapp', label: 'WhatsApp', enabled: true, required: true, type: 'phone' as const },
          { field: 'email', label: 'E-mail', enabled: true, required: false, type: 'email' as const },
        ];
  }, [checkoutFields]);

  const hasCpfField = enabledFields.some(f => f.field === 'cpf' || f.field === 'documento');
  const currentFormData = attendees[activeIndex] || createEmptyAttendee();
  const currentErrors = errorsList[activeIndex] || {};

  const areOtherFieldsVisible = !hasCpfField || currentFormData.is_foreign || cpfConsultedMap[activeIndex];

  const isFieldEnabled = (field: string) => {
    if (field === 'cpf' || field === 'documento') {
      return enabledFields.some(f => f.field === 'cpf' || f.field === 'documento');
    }
    if (field === 'notes' || field === 'observacoes') {
      return enabledFields.some(f => f.field === 'notes' || f.field === 'observacoes');
    }
    return enabledFields.some(f => f.field === field);
  };

  const isFieldRequired = (field: string) => {
    if (field === 'nome' || field === 'whatsapp') return true;
    const config = enabledFields.find(f => 
      f.field === field || 
      (field === 'documento' && f.field === 'cpf') ||
      (field === 'cpf' && f.field === 'documento') ||
      (field === 'observacoes' && f.field === 'notes') ||
      (field === 'notes' && f.field === 'observacoes')
    );
    return Boolean(config?.required);
  };

  const handleInputChange = (field: keyof CheckoutClientData, value: any) => {
    setAttendees(prev => {
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], [field]: value };
      return next;
    });

    if (currentErrors[field]) {
      setErrorsList(prev => {
        const next = [...prev];
        next[activeIndex] = { ...(next[activeIndex] || {}), [field]: '' };
        return next;
      });
    }
  };

  // Buscar cliente existente na tabela app_people por CPF/documento ou WhatsApp
  const lookupExistingClient = async (searchField: 'cpf' | 'whatsapp', searchValue: string) => {
    const cleanVal = searchValue.replace(/\D/g, '');
    if (!cleanVal || (searchField === 'cpf' && cleanVal.length !== 11) || (searchField === 'whatsapp' && cleanVal.length < 9)) {
      return;
    }

    try {
      setIsSearchingClient(true);
      let query = supabase.from('app_people').select('*');

      if (searchField === 'cpf') {
        query = query.or(`documento.eq.${cleanVal},documento.eq.${searchValue}`);
      } else {
        query = query.or(`whatsapp.eq.${cleanVal},whatsapp.eq.${searchValue},whatsapp.eq.+55${cleanVal},telefone.eq.${cleanVal},telefone.eq.${searchValue}`);
      }

      const { data, error } = await query.maybeSingle();

      if (searchField === 'cpf') {
        setCpfConsultedMap(prev => ({ ...prev, [activeIndex]: true }));
      }

      if (!error && data) {
        const docVal = data.documento || data.cpf || '';
        const obsVal = data.observacoes || data.notes || '';
        const endVal = data.logradouro || data.endereco || data.address || '';
        const ufVal = data.uf || data.estado || data.state || '';

        setAttendees(prev => {
          const next = [...prev];
          next[activeIndex] = {
            ...next[activeIndex],
            nome: data.nome || data.name || next[activeIndex].nome,
            whatsapp: data.whatsapp || data.phone || next[activeIndex].whatsapp,
            telefone: data.telefone || next[activeIndex].telefone,
            email: data.email || next[activeIndex].email,
            cpf: docVal ? formatCPF(docVal) : next[activeIndex].cpf,
            documento: docVal ? formatCPF(docVal) : next[activeIndex].documento,
            apelido: data.apelido || next[activeIndex].apelido,
            data_nascimento: data.data_nascimento || next[activeIndex].data_nascimento,
            profissao: data.profissao || next[activeIndex].profissao,
            empresa: data.empresa || next[activeIndex].empresa,
            cep: data.cep ? formatCEP(data.cep) : next[activeIndex].cep,
            logradouro: endVal || next[activeIndex].logradouro,
            numero: data.numero || next[activeIndex].numero,
            complemento: data.complemento || next[activeIndex].complemento,
            bairro: data.bairro || next[activeIndex].bairro,
            cidade: data.cidade || data.city || next[activeIndex].cidade,
            uf: ufVal || next[activeIndex].uf,
            observacoes: obsVal || next[activeIndex].observacoes,
            notes: obsVal || next[activeIndex].notes
          };
          return next;
        });

        setAutoFilledMap(prev => ({ ...prev, [activeIndex]: true }));
        setIsExistingClientMap(prev => ({ ...prev, [activeIndex]: true }));
        toast.success(`Cadastro de ${data.nome ? data.nome.split(' ')[0] : 'participante'} localizado!`);
      } else {
        if (searchField === 'cpf') {
          setIsExistingClientMap(prev => ({ ...prev, [activeIndex]: false }));
          setAutoFilledMap(prev => ({ ...prev, [activeIndex]: false }));
          toast.info('CPF não cadastrado. Complete as informações abaixo.');
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar cliente por documento/telefone:', err);
      if (searchField === 'cpf') {
        setCpfConsultedMap(prev => ({ ...prev, [activeIndex]: true }));
      }
    } finally {
      setIsSearchingClient(false);
    }
  };

  // Handler para alteração do CPF com busca automática
  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    handleInputChange('cpf', formatted);
    handleInputChange('documento', formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 11) {
      lookupExistingClient('cpf', formatted);
    } else {
      if (cpfConsultedMap[activeIndex]) {
        setCpfConsultedMap(prev => ({ ...prev, [activeIndex]: false }));
        setIsExistingClientMap(prev => ({ ...prev, [activeIndex]: false }));
        setAutoFilledMap(prev => ({ ...prev, [activeIndex]: false }));
      }
    }
  };

  // Handler para alteração de estrangeiro
  const handleForeignToggle = (checked: boolean) => {
    handleInputChange('is_foreign', checked);
    if (checked) {
      setCpfConsultedMap(prev => ({ ...prev, [activeIndex]: true }));
    } else {
      const currentDoc = currentFormData.documento || currentFormData.cpf || '';
      const clean = currentDoc.replace(/\D/g, '');
      if (clean.length !== 11) {
        setCpfConsultedMap(prev => ({ ...prev, [activeIndex]: false }));
        setIsExistingClientMap(prev => ({ ...prev, [activeIndex]: false }));
        setAutoFilledMap(prev => ({ ...prev, [activeIndex]: false }));
      }
    }
  };

  // Handler para busca de CEP via ViaCEP
  const handleCepBlur = async () => {
    if (!currentFormData.cep) return;
    const cleanCep = currentFormData.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      setIsSearchingCep(true);
      const res = await fetchAddressByCEP(cleanCep);
      if (res) {
        setAttendees(prev => {
          const next = [...prev];
          next[activeIndex] = {
            ...next[activeIndex],
            logradouro: res.logradouro || next[activeIndex].logradouro,
            bairro: res.bairro || next[activeIndex].bairro,
            cidade: res.localidade || next[activeIndex].cidade,
            uf: res.uf || next[activeIndex].uf
          };
          return next;
        });
        toast.success('Endereço preenchido pelo CEP!');
      }
    } catch (e) {
      console.warn('Erro ao buscar ViaCEP:', e);
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Copiar dados de endereço do Comprador (Ingresso 1) para o participante atual
  const copyAddressFromBuyer = () => {
    const buyer = attendees[0];
    if (!buyer) return;

    setAttendees(prev => {
      const next = [...prev];
      next[activeIndex] = {
        ...next[activeIndex],
        cep: buyer.cep || '',
        logradouro: buyer.logradouro || '',
        numero: buyer.numero || '',
        complemento: buyer.complemento || '',
        bairro: buyer.bairro || '',
        cidade: buyer.cidade || '',
        uf: buyer.uf || ''
      };
      return next;
    });

    toast.success('Endereço do comprador copiado com sucesso!');
  };

  // Validação de um participante específico
  const isAttendeeValid = (idx: number): boolean => {
    const att = attendees[idx];
    if (!att) return false;

    // Se tem campo CPF, precisa ter consultado ou marcado estrangeiro
    if (hasCpfField) {
      const isVisible = att.is_foreign || cpfConsultedMap[idx] || (att.cpf?.replace(/\D/g, '').length === 11);
      if (!isVisible) return false;

      const docVal = att.documento || att.cpf || '';
      if (!att.is_foreign) {
        if (isFieldRequired('cpf')) {
          if (!docVal.trim() || !validateCPF(docVal)) return false;
        } else if (docVal.trim() && !validateCPF(docVal)) {
          return false;
        }
      } else {
        if (isFieldRequired('cpf') && !att.foreign_document?.trim()) {
          return false;
        }
      }
    }

    // Nome Completo
    if (!att.nome || !att.nome.trim()) return false;

    // WhatsApp
    const cleanPhone = (att.whatsapp || '').replace(/\D/g, '');
    if (!att.whatsapp?.trim() || cleanPhone.length < 10) return false;

    // Telefone
    if (isFieldEnabled('telefone') && isFieldRequired('telefone')) {
      const cleanTel = (att.telefone || '').replace(/\D/g, '');
      if (!att.telefone?.trim() || cleanTel.length < 8) return false;
    }

    // E-mail
    if (isFieldEnabled('email')) {
      if (isFieldRequired('email')) {
        if (!att.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(att.email.trim())) return false;
      } else if (att.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(att.email.trim())) {
        return false;
      }
    }

    // CEP
    if (isFieldEnabled('cep') && isFieldRequired('cep')) {
      const cleanCep = (att.cep || '').replace(/\D/g, '');
      if (!cleanCep || cleanCep.length !== 8) return false;
    }

    // Demais campos obrigatórios
    const genericFields: (keyof CheckoutClientData)[] = [
      'apelido', 'data_nascimento', 'profissao', 'empresa', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'observacoes', 'notes'
    ];

    for (const f of genericFields) {
      if (isFieldEnabled(f as string) && isFieldRequired(f as string)) {
        if (!att[f] || String(att[f]).trim() === '') {
          return false;
        }
      }
    }

    return true;
  };

  // Verifica se todos os N participantes estão válidos
  const areAllAttendeesValid = useMemo(() => {
    for (let i = 0; i < actualQty; i++) {
      if (!isAttendeeValid(i)) return false;
    }
    return true;
  }, [attendees, actualQty, cpfConsultedMap, enabledFields]);

  // Validação profunda para exibir erros visuais
  const validateCurrentTab = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const att = currentFormData;

    // 1. CPF / Estrangeiro
    if (hasCpfField) {
      const docVal = att.documento || att.cpf || '';
      if (!att.is_foreign) {
        if (isFieldRequired('cpf') && !docVal.trim()) {
          newErrors.cpf = 'CPF é obrigatório';
        } else if (docVal.trim() && !validateCPF(docVal)) {
          newErrors.cpf = 'CPF inválido. Verifique os dígitos.';
        }
      } else {
        if (isFieldRequired('cpf') && !att.foreign_document?.trim()) {
          newErrors.foreign_document = 'Documento estrangeiro é obrigatório';
        }
      }
    }

    if (!areOtherFieldsVisible) {
      toast.error('Informe o CPF deste participante para continuar.');
      return false;
    }

    // 2. Nome
    if (!att.nome?.trim()) {
      newErrors.nome = 'Nome completo é obrigatório';
    }

    // 3. WhatsApp
    const cleanPhone = (att.whatsapp || '').replace(/\D/g, '');
    if (!att.whatsapp?.trim() || cleanPhone.length < 10) {
      newErrors.whatsapp = 'WhatsApp válido com DDD é obrigatório';
    }

    // 4. Telefone
    if (isFieldEnabled('telefone') && isFieldRequired('telefone')) {
      const cleanTel = (att.telefone || '').replace(/\D/g, '');
      if (!att.telefone?.trim() || cleanTel.length < 8) {
        newErrors.telefone = 'Telefone válido é obrigatório';
      }
    }

    // 5. E-mail
    if (isFieldEnabled('email')) {
      if (isFieldRequired('email') && !att.email?.trim()) {
        newErrors.email = 'E-mail é obrigatório';
      } else if (att.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(att.email.trim())) {
        newErrors.email = 'Informe um e-mail válido';
      }
    }

    // 6. CEP
    if (isFieldEnabled('cep') && isFieldRequired('cep')) {
      const cleanCep = (att.cep || '').replace(/\D/g, '');
      if (!cleanCep || cleanCep.length !== 8) {
        newErrors.cep = 'CEP válido com 8 dígitos é obrigatório';
      }
    }

    // 7. Demais
    const genericFields: (keyof CheckoutClientData)[] = [
      'apelido', 'data_nascimento', 'profissao', 'empresa', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'observacoes', 'notes'
    ];

    genericFields.forEach(f => {
      if (isFieldEnabled(f as string) && isFieldRequired(f as string)) {
        if (!att[f] || String(att[f]).trim() === '') {
          newErrors[f] = 'Este campo é obrigatório';
        }
      }
    });

    setErrorsList(prev => {
      const next = [...prev];
      next[activeIndex] = newErrors;
      return next;
    });

    return Object.keys(newErrors).length === 0;
  };

  const handleNextTab = () => {
    if (validateCurrentTab()) {
      if (activeIndex < actualQty - 1) {
        setActiveIndex(prev => prev + 1);
      }
    } else {
      toast.error('Por favor, complete os campos obrigatórios deste ingresso.');
    }
  };

  const handlePrevTab = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todas as abas
    let firstInvalidIndex = -1;
    for (let i = 0; i < actualQty; i++) {
      if (!isAttendeeValid(i)) {
        firstInvalidIndex = i;
        break;
      }
    }

    if (firstInvalidIndex !== -1) {
      setActiveIndex(firstInvalidIndex);
      validateCurrentTab();
      toast.error(`Por favor, complete todos os campos do Ingresso ${firstInvalidIndex + 1}.`);
      return;
    }

    try {
      let buyerPersonId: string | null = null;

      // Salvar ou atualizar todos os participantes na tabela app_people
      for (let i = 0; i < attendees.length; i++) {
        const att = attendees[i];
        const cleanPhone = (att.whatsapp || att.telefone || '').replace(/\D/g, '');
        const docVal = att.documento || att.cpf || '';
        const cleanDoc = docVal ? docVal.replace(/\D/g, '') : null;
        const obsVal = att.observacoes || att.notes || '';
        const formattedNotes = att.is_foreign 
          ? `[Estrangeiro: ${att.foreign_document || 'Sim'}] ${obsVal}`.trim()
          : obsVal.trim() || null;

        let existingPersonId: string | null = null;

        // 1. Tentar encontrar por documento (CPF)
        if (cleanDoc) {
          const { data: byDoc } = await supabase
            .from('app_people')
            .select('id')
            .or(`documento.eq.${cleanDoc},documento.eq.${docVal}`)
            .limit(1)
            .maybeSingle();
          if (byDoc?.id) existingPersonId = byDoc.id;
        }

        // 2. Se não encontrou, tentar por WhatsApp/Telefone
        if (!existingPersonId && cleanPhone) {
          const { data: byPhone } = await supabase
            .from('app_people')
            .select('id')
            .or(`whatsapp.eq.${att.whatsapp},whatsapp.eq.${cleanPhone},whatsapp.eq.+55${cleanPhone},telefone.eq.${cleanPhone}`)
            .limit(1)
            .maybeSingle();
          if (byPhone?.id) existingPersonId = byPhone.id;
        }

        // 3. Montar payload completo com todos os dados capturados no formulário
        const personPayload: any = {
          nome: att.nome.trim(),
          whatsapp: att.whatsapp?.trim() || cleanPhone,
          telefone: att.telefone?.trim() || null,
          email: att.email?.trim() || null,
          documento: att.is_foreign ? null : cleanDoc || docVal || null,
          apelido: att.apelido?.trim() || null,
          data_nascimento: att.data_nascimento || null,
          profissao: att.profissao?.trim() || null,
          empresa: att.empresa?.trim() || null,
          cep: att.cep?.trim() || null,
          logradouro: att.logradouro?.trim() || null,
          numero: att.numero?.trim() || null,
          complemento: att.complemento?.trim() || null,
          bairro: att.bairro?.trim() || null,
          cidade: att.cidade?.trim() || null,
          uf: att.uf?.trim() || null,
          notes: formattedNotes,
          observacoes: formattedNotes,
          validated: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        let savedId = existingPersonId;

        if (existingPersonId) {
          const { data: updated, error: updateErr } = await supabase
            .from('app_people')
            .update(personPayload)
            .eq('id', existingPersonId)
            .select('id')
            .maybeSingle();

          if (!updateErr && updated?.id) {
            savedId = updated.id;
          } else if (updateErr) {
            console.warn('Tentativa com payload simplificado de update em app_people:', updateErr.message);
            const { data: simpleUpdated } = await supabase
              .from('app_people')
              .update({
                nome: att.nome.trim(),
                whatsapp: att.whatsapp?.trim() || cleanPhone,
                email: att.email?.trim() || null,
                documento: att.is_foreign ? null : cleanDoc || docVal,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPersonId)
              .select('id')
              .maybeSingle();
            if (simpleUpdated?.id) savedId = simpleUpdated.id;
          }
        } else {
          const insertPayload = {
            ...personPayload,
            created_at: new Date().toISOString(),
          };

          const { data: inserted, error: insertErr } = await supabase
            .from('app_people')
            .insert(insertPayload)
            .select('id')
            .maybeSingle();

          if (!insertErr && inserted?.id) {
            savedId = inserted.id;
          } else if (insertErr) {
            console.warn('Tentativa com payload simplificado de insert em app_people:', insertErr.message);
            const { data: simpleInserted } = await supabase
              .from('app_people')
              .insert({
                nome: att.nome.trim(),
                whatsapp: att.whatsapp?.trim() || cleanPhone,
                email: att.email?.trim() || null,
                documento: att.is_foreign ? null : cleanDoc || docVal,
                validated: true,
                is_active: true,
                created_at: new Date().toISOString(),
              })
              .select('id')
              .maybeSingle();

            if (simpleInserted?.id) savedId = simpleInserted.id;
          }
        }

        attendees[i].person_id = savedId;
        attendees[i].client_id = savedId;

        if (i === 0) {
          buyerPersonId = savedId;
        }
      }

      // Prosseguir com o checkout passando comprador, participantes e id da pessoa na app_people
      onSubmit(attendees[0], attendees, buyerPersonId);
    } catch (err) {
      console.error('Erro ao salvar dados dos participantes na tabela app_people:', err);
      onSubmit(attendees[0], attendees, null);
    }
  };

  // Renderizar cada campo individual
  const renderField = (fieldConfig: CheckoutFieldConfig) => {
    const { field, label } = fieldConfig;
    const isRequired = isFieldRequired(field);
    const val = currentFormData[field as keyof CheckoutClientData] || '';

    switch (field) {
      case 'nome':
        return (
          <div key="nome" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Nome Completo'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={val as string}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Ex: João da Silva"
                disabled={loading}
                className={`w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border transition-colors ${
                  currentErrors.nome ? 'border-red-300 bg-red-50/50 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
            </div>
            {currentErrors.nome && <p className="text-xs text-red-600 mt-1">{currentErrors.nome}</p>}
          </div>
        );

      case 'whatsapp':
        return (
          <div key="whatsapp" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'WhatsApp'} <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={val as string}
              onChange={(v) => handleInputChange('whatsapp', v)}
              onBlur={() => !hasCpfField && lookupExistingClient('whatsapp', val as string)}
              placeholder="(11) 99999-9999"
              error={!!currentErrors.whatsapp}
              disabled={loading}
              name={`whatsapp_${activeIndex}`}
            />
            {currentErrors.whatsapp && <p className="text-xs text-red-600 mt-1">{currentErrors.whatsapp}</p>}
          </div>
        );

      case 'telefone':
        return (
          <div key="telefone" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Telefone'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <PhoneInput
              value={val as string}
              onChange={(v) => handleInputChange('telefone', v)}
              placeholder="(11) 3333-4444"
              error={!!currentErrors.telefone}
              disabled={loading}
              name={`telefone_${activeIndex}`}
            />
            {currentErrors.telefone && <p className="text-xs text-red-600 mt-1">{currentErrors.telefone}</p>}
          </div>
        );

      case 'email':
        return (
          <div key="email" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'E-mail'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={val as string}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seuemail@exemplo.com"
                disabled={loading}
                className={`w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border transition-colors ${
                  currentErrors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
            </div>
            {currentErrors.email && <p className="text-xs text-red-600 mt-1">{currentErrors.email}</p>}
          </div>
        );

      case 'apelido':
        return (
          <div key="apelido" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Apelido / Nome Social'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={val as string}
              onChange={(e) => handleInputChange('apelido', e.target.value)}
              placeholder="Como prefere ser chamado"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
            />
            {currentErrors.apelido && <p className="text-xs text-red-600 mt-1">{currentErrors.apelido}</p>}
          </div>
        );

      case 'data_nascimento':
        return (
          <div key="data_nascimento" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Data de Nascimento'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={val as string}
                onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                disabled={loading}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 bg-white focus:ring-indigo-500"
              />
            </div>
            {currentErrors.data_nascimento && <p className="text-xs text-red-600 mt-1">{currentErrors.data_nascimento}</p>}
          </div>
        );

      case 'profissao':
        return (
          <div key="profissao" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Profissão / Cargo'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={val as string}
                onChange={(e) => handleInputChange('profissao', e.target.value)}
                placeholder="Ex: Arquiteto, Engenheiro, Designer..."
                disabled={loading}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
              />
            </div>
            {currentErrors.profissao && <p className="text-xs text-red-600 mt-1">{currentErrors.profissao}</p>}
          </div>
        );

      case 'empresa':
        return (
          <div key="empresa" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Empresa / Organização'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={val as string}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                placeholder="Nome da empresa"
                disabled={loading}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
              />
            </div>
            {currentErrors.empresa && <p className="text-xs text-red-600 mt-1">{currentErrors.empresa}</p>}
          </div>
        );

      case 'cep':
        return (
          <div key="cep" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'CEP'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={val as string}
                onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                maxLength={9}
                disabled={loading}
                className={`w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border transition-colors bg-white ${
                  currentErrors.cep ? 'border-red-300 bg-red-50/50' : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
              {isSearchingCep && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
              )}
            </div>
            {currentErrors.cep && <p className="text-xs text-red-600 mt-1">{currentErrors.cep}</p>}
          </div>
        );

      case 'logradouro':
        return (
          <div key="logradouro" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Endereço / Logradouro'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={val as string}
              onChange={(e) => handleInputChange('logradouro', e.target.value)}
              placeholder="Nome da rua / avenida"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
            />
            {currentErrors.logradouro && <p className="text-xs text-red-600 mt-1">{currentErrors.logradouro}</p>}
          </div>
        );

      case 'numero':
        return (
          <div key="numero" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Número'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={val as string}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              placeholder="123"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
            />
            {currentErrors.numero && <p className="text-xs text-red-600 mt-1">{currentErrors.numero}</p>}
          </div>
        );

      case 'complemento':
        return (
          <div key="complemento" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Complemento'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={val as string}
              onChange={(e) => handleInputChange('complemento', e.target.value)}
              placeholder="Apto, Bloco, Casa..."
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
            />
            {currentErrors.complemento && <p className="text-xs text-red-600 mt-1">{currentErrors.complemento}</p>}
          </div>
        );

      case 'bairro':
        return (
          <div key="bairro" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Bairro'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={val as string}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
              placeholder="Bairro"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
            />
            {currentErrors.bairro && <p className="text-xs text-red-600 mt-1">{currentErrors.bairro}</p>}
          </div>
        );

      case 'cidade':
        return (
          <div key="cidade" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Cidade'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={val as string}
              onChange={(e) => handleInputChange('cidade', e.target.value)}
              placeholder="Cidade"
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500"
            />
            {currentErrors.cidade && <p className="text-xs text-red-600 mt-1">{currentErrors.cidade}</p>}
          </div>
        );

      case 'uf':
        return (
          <div key="uf" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Estado (UF)'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={(val as string) || ''}
              onChange={(e) => handleInputChange('uf', e.target.value)}
              disabled={loading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 bg-white font-medium focus:ring-indigo-500"
            >
              <option value="">Selecione o Estado (UF)...</option>
              {BRAZIL_STATES.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            {currentErrors.uf && <p className="text-xs text-red-600 mt-1">{currentErrors.uf}</p>}
          </div>
        );

      case 'notes':
      case 'observacoes':
        return (
          <div key="notes" className="animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              {label || 'Observações / Como soube'} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={(val as string) || ''}
              onChange={(e) => {
                handleInputChange('observacoes', e.target.value);
                handleInputChange('notes', e.target.value);
              }}
              placeholder="Ex: Indicação de amigo, redes sociais, necessidades especiais..."
              rows={2}
              disabled={loading}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-indigo-500 resize-none"
            />
            {currentErrors.observacoes && <p className="text-xs text-red-600 mt-1">{currentErrors.observacoes}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const cpfConfig = enabledFields.find(f => f.field === 'documento' || f.field === 'cpf');
  const otherFields = hasCpfField 
    ? enabledFields.filter(f => f.field !== 'documento' && f.field !== 'cpf')
    : enabledFields;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1 rounded-full hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Identificação dos Participantes</h2>
              <p className="text-xs text-blue-200">
                {actualQty > 1 
                  ? `Preencha os dados dos ${actualQty} ingressos selecionados`
                  : (eventTitle ? `Para o evento: ${eventTitle}` : 'Preencha seus dados para emissão dos ingressos')}
              </p>
            </div>
          </div>

          {/* Abas dos Ingressos quando quantity > 1 */}
          {actualQty > 1 && (
            <div className="mt-4 pt-3 border-t border-white/10 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {attendees.map((_, idx) => {
                const isValid = isAttendeeValid(idx);
                const isActive = idx === activeIndex;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{idx === 0 ? '1. Comprador' : `${idx + 1}º Ingresso`}</span>
                    {isValid ? (
                      <span className="w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className="w-4 h-4 bg-gray-500/50 text-gray-300 rounded-full flex items-center justify-center text-[10px]">
                        ○
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Título do Participante Atual & Botão Copiar Endereço */}
          {actualQty > 1 && (
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-indigo-600" />
                {activeIndex === 0 ? 'Dados do Comprador (Ingresso 1)' : `Titular do Ingresso ${activeIndex + 1}`}
              </span>
              {activeIndex > 0 && isFieldEnabled('cep') && (
                <button
                  type="button"
                  onClick={copyAddressFromBuyer}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar endereço do comprador
                </button>
              )}
            </div>
          )}

          {/* Se o evento tem campo de CPF/Documento, renderiza primeiro o bloco de CPF */}
          {hasCpfField && cpfConfig && (
            <div className="space-y-2.5 bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-4 rounded-2xl border border-indigo-100/90 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  {currentFormData.is_foreign ? 'Documento Estrangeiro' : (cpfConfig?.label || 'CPF')}{' '}
                  {isFieldRequired('cpf') && <span className="text-red-500">*</span>}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={currentFormData.is_foreign || false}
                    onChange={(e) => handleForeignToggle(e.target.checked)}
                    disabled={loading}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-medium flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                    Sou estrangeiro
                  </span>
                </label>
              </div>

              {!currentFormData.is_foreign ? (
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={currentFormData.cpf || currentFormData.documento || ''}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      onBlur={() => lookupExistingClient('cpf', currentFormData.cpf || currentFormData.documento || '')}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      disabled={loading}
                      autoFocus
                      className={`w-full pl-10 pr-10 py-3 text-sm font-medium rounded-xl border transition-all bg-white shadow-sm ${
                        currentErrors.cpf || currentErrors.documento
                          ? 'border-red-300 bg-red-50/50 focus:ring-red-400' 
                          : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                      }`}
                    />
                    {isSearchingClient && (
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  {(currentErrors.cpf || currentErrors.documento) && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{currentErrors.cpf || currentErrors.documento}</p>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={currentFormData.foreign_document || ''}
                    onChange={(e) => handleInputChange('foreign_document', e.target.value)}
                    placeholder="Número do Passaporte ou Documento de Identidade"
                    disabled={loading}
                    autoFocus
                    className={`w-full px-3.5 py-3 text-sm rounded-xl border transition-colors bg-white shadow-sm ${
                      currentErrors.foreign_document ? 'border-red-300 bg-red-50/50' : 'border-gray-300 focus:ring-indigo-500'
                    }`}
                  />
                  {currentErrors.foreign_document && <p className="text-xs text-red-600 mt-1.5">{currentErrors.foreign_document}</p>}
                </div>
              )}
            </div>
          )}

          {/* Mensagem de estado de busca */}
          {hasCpfField && (
            <>
              {isSearchingClient && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 font-medium animate-in fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span>Consultando cadastro no sistema...</span>
                </div>
              )}

              {!isSearchingClient && isExistingClientMap[activeIndex] && autoFilledMap[activeIndex] && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cadastro localizado! Dados preenchidos automaticamente.</span>
                </div>
              )}

              {!isSearchingClient && cpfConsultedMap[activeIndex] && !isExistingClientMap[activeIndex] && !currentFormData.is_foreign && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-800 font-medium animate-in fade-in">
                  <UserPlus className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Novo participante. Complete as informações abaixo.</span>
                </div>
              )}

              {!areOtherFieldsVisible && (
                <div className="py-8 px-4 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                  <Sparkles className="w-6 h-6 text-indigo-400 mx-auto" />
                  <p className="text-xs font-semibold text-gray-700">
                    Digite o CPF do participante acima para continuar
                  </p>
                  <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                    Se já houver cadastro na base, os dados serão preenchidos automaticamente.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Demais campos do formulário */}
          {areOtherFieldsVisible && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {otherFields.map(renderField)}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              {actualQty > 1 && activeIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevTab}
                  disabled={loading}
                  className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-1">
              {actualQty > 1 && activeIndex < actualQty - 1 ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  disabled={loading || !isAttendeeValid(activeIndex)}
                  className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    isAttendeeValid(activeIndex)
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-600/20 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <span>Próximo Ingresso ({activeIndex + 2}/{actualQty})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !areAllAttendeesValid}
                  className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    areAllAttendeesValid && !loading
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-600/20 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : !areAllAttendeesValid ? (
                    <span>Preencha todos os {actualQty} ingressos</span>
                  ) : (
                    <span>Continuar para Pagamento</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutClientModal;
