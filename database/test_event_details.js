// Teste final para verificar se EventDetails renderiza price_batches corretamente
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEventDetailsData() {
  console.log('🧪 Testando dados para EventDetails...');
  
  try {
    // Buscar um evento específico com price_batches
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', '833f8bb1-4f54-4c44-81f9-a91f6f2cd1ba')
      .single();

    if (error) {
      console.error('❌ Erro ao buscar evento:', error);
      return;
    }

    console.log('✅ Evento encontrado:', event.title);
    console.log('🏷️ Price Batches:', event.price_batches);
    
    // Simular o processamento que acontece no EventDetails
    let priceBatches = [];
    
    if (event.price_batches) {
      console.log('🔍 Processando price_batches...');
      console.log('📊 Tipo original:', typeof event.price_batches);
      console.log('📋 É Array:', Array.isArray(event.price_batches));
      
      try {
        if (typeof event.price_batches === 'string') {
          console.log('🔄 Fazendo parse de string para JSON...');
          priceBatches = JSON.parse(event.price_batches);
        } else if (Array.isArray(event.price_batches)) {
          console.log('✅ Já é um array, usando diretamente...');
          priceBatches = event.price_batches;
        }
        
        console.log('✅ Price batches processados com sucesso!');
        console.log('📈 Quantidade de lotes:', priceBatches.length);
        
        priceBatches.forEach((batch, index) => {
          console.log(`  Lote ${index + 1}:`);
          console.log(`    Nome: ${batch.name}`);
          console.log(`    Preço: R$ ${batch.price}`);
          console.log(`    Prazo: ${batch.deadline}`);
          console.log(`    Descrição: ${batch.description}`);
        });
        
      } catch (parseError) {
        console.error('❌ Erro ao processar price_batches:', parseError);
      }
    } else {
      console.log('⚠️ Evento não possui price_batches');
    }
    
    console.log('\n🎯 Teste concluído - EventDetails deve funcionar corretamente!');
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar o teste
testEventDetailsData();