import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserExists() {
  console.log('Verificando se o usuário existe...');
  
  try {
    // Verificar na tabela admin_users
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'betternow@cesire.com.br');
    
    if (adminError) {
      console.error('Erro ao buscar admin_users:', adminError);
    } else {
      console.log('Usuários admin encontrados:', adminUsers?.length || 0);
      if (adminUsers && adminUsers.length > 0) {
        console.log('Dados do admin:', adminUsers[0]);
      }
    }
    
    // Tentar fazer login para verificar se existe no auth
    console.log('\nTestando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'betternow@cesire.com.br',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('Erro no login:', loginError.message);
    } else {
      console.log('Login bem-sucedido!');
      console.log('Usuário logado:', loginData.user?.email);
      
      // Fazer logout
      await supabase.auth.signOut();
      console.log('Logout realizado.');
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

checkUserExists();