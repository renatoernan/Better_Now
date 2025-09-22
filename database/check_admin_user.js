import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminUser() {
  try {
    console.log('Verificando usuário admin...');
    
    // Verificar se o usuário existe na tabela admin_users
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'betternow@cesire.com.br')
      .single();
    
    if (adminError) {
      console.error('Erro ao buscar admin_users:', adminError);
    } else {
      console.log('Usuário admin encontrado:', adminUser);
    }
    
    // Tentar fazer login para testar autenticação
    console.log('Testando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'betternow@cesire.com.br',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('Erro no login:', loginError);
    } else {
      console.log('Login bem-sucedido:', loginData.user?.email);
      
      // Fazer logout após o teste
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

checkAdminUser();