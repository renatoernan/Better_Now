// Script para testar o carregamento de eventos com price_batches
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEventLoading() {
  console.log('🧪 Testando carregamento de eventos com price_batches...');
  
  try {
    // Buscar eventos com price_batches
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .not('price_batches', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Erro ao buscar eventos:', error);
      return;
    }

    console.log(`✅ Encontrados ${events.length} eventos com price_batches`);
    
    events.forEach((event, index) => {
      console.log(`\n📅 Evento ${index + 1}: ${event.title}`);
      console.log('🏷️ Price Batches:', event.price_batches);
      console.log('🔍 Tipo:', typeof event.price_batches);
      console.log('📊 É Array:', Array.isArray(event.price_batches));
      
      if (Array.isArray(event.price_batches)) {
        console.log(`📈 Quantidade de lotes: ${event.price_batches.length}`);
        event.price_batches.forEach((batch, batchIndex) => {
          console.log(`  Lote ${batchIndex + 1}:`, batch);
        });
      }
    });
    
    // Testar carregamento de um evento específico
    if (events.length > 0) {
      const eventId = events[0].id;
      console.log(`\n🎯 Testando carregamento do evento ID: ${eventId}`);
      
      const { data: singleEvent, error: singleError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
        
      if (singleError) {
        console.error('❌ Erro ao buscar evento específico:', singleError);
      } else {
        console.log('✅ Evento carregado com sucesso!');
        console.log('🏷️ Price Batches do evento:', singleEvent.price_batches);
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testEventLoading();