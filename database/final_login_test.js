import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('=== TESTE FINAL DE LOGIN ===');
  console.log('URL:', supabaseUrl);
  console.log('Testando credenciais: betternow@cesire.com.br / admin123');
  console.log('');
  
  try {
    // Teste 1: Verificar conectividade
    console.log('1. Testando conectividade com Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('admin_users')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Erro de conectividade:', healthError.message);
    } else {
      console.log('✅ Conectividade OK');
    }
    
    // Teste 2: Tentar login
    console.log('\n2. Tentando fazer login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'betternow@cesire.com.br',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      console.error('Código do erro:', loginError.status);
      
      // Teste 3: Verificar se o usuário existe no Auth
      console.log('\n3. Verificando se o usuário existe...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'betternow@cesire.com.br',
        password: 'admin123'
      });
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          console.log('✅ Usuário já existe no Auth');
        } else {
          console.error('❌ Erro ao verificar usuário:', signUpError.message);
        }
      } else {
        console.log('✅ Usuário criado/confirmado no Auth');
        if (signUpData.user) {
          console.log('ID do usuário:', signUpData.user.id);
        }
      }
      
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log('Usuário logado:', loginData.user.email);
      console.log('ID do usuário:', loginData.user.id);
      
      // Teste 4: Verificar dados do admin
      console.log('\n4. Verificando dados na tabela admin_users...');
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', loginData.user.id)
        .single();
      
      if (adminError) {
        console.error('❌ Erro ao buscar dados do admin:', adminError.message);
      } else {
        console.log('✅ Dados do admin encontrados:', adminData);
      }
      
      // Fazer logout
      await supabase.auth.signOut();
      console.log('\n✅ Logout realizado com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
  
  console.log('\n=== FIM DO TESTE ===');
}

testLogin();