import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertAdminUser() {
  console.log('Tentando inserir usuário admin diretamente...');
  
  try {
    // Primeiro, vamos verificar se já existe
    const { data: existing, error: checkError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'betternow@cesire.com.br');
    
    if (checkError) {
      console.error('Erro ao verificar usuário existente:', checkError);
      return;
    }
    
    console.log('Usuários existentes:', existing?.length || 0);
    
    if (existing && existing.length > 0) {
      console.log('Usuário já existe:', existing[0]);
      return;
    }
    
    // Tentar inserir com UUID gerado
    const userId = crypto.randomUUID();
    console.log('Inserindo com UUID:', userId);
    
    const { data: insertData, error: insertError } = await supabase
      .from('admin_users')
      .insert({
        id: userId,
        email: 'betternow@cesire.com.br',
        role: 'super_admin',
        created_at: new Date().toISOString(),
        last_login: null
      })
      .select();
    
    if (insertError) {
      console.error('Erro ao inserir usuário:', insertError);
    } else {
      console.log('Usuário inserido com sucesso:', insertData);
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

insertAdminUser();