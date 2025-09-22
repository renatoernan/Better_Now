// Script para criar evento de teste com price_batches
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEvent() {
  try {
    console.log('Criando evento de teste com price_batches...');
    
    const eventData = {
      title: 'Evento Teste Price Batches',
      description: 'Evento para testar o carregamento de price_batches',
      event_type: 'casamento',
      event_date: '2025-02-15',
      event_time: '19:00:00',
      location: 'Local de Teste',
      max_guests: 100,
      current_guests: 0,
      price_batches: [
        {
          name: '1º Lote',
          price: 150.00,
          description: 'Primeiros 50 ingressos',
          deadline: '2025-01-15'
        },
        {
          name: '2º Lote', 
          price: 200.00,
          description: 'Próximos 30 ingressos',
          deadline: '2025-02-01'
        }
      ],
      status: 'active',
      is_public: true
    };

    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select();

    if (error) {
      console.error('Erro ao criar evento:', error);
      return;
    }

    console.log('Evento criado com sucesso:', data);
    
    // Verificar como foi salvo
    const { data: savedEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('title', 'Evento Teste Price Batches')
      .single();
      
    if (fetchError) {
      console.error('Erro ao buscar evento:', fetchError);
      return;
    }
    
    console.log('Evento salvo no banco:', {
      id: savedEvent.id,
      title: savedEvent.title,
      price_batches: savedEvent.price_batches,
      price_batches_type: typeof savedEvent.price_batches,
      is_array: Array.isArray(savedEvent.price_batches)
    });
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createTestEvent();