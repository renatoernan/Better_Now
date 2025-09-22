import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzNTkyNSwiZXhwIjoyMDczNjExOTI1fQ.v6WKlRQS0v5dfOxcrveO-lc9xkl4CF3cfm19vvqZ90E';

// Cliente com service role para operações administrativas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente normal para teste de login
const supabaseClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzU5MjUsImV4cCI6MjA3MzYxMTkyNX0.tdPsDAkZDbRd64zsPG2pqZSzZh13SCVUJjwgg2PS3wI');

async function createAuthUser() {
  console.log('Criando usuário no Supabase Auth...');
  
  try {
    // 1. Criar usuário no Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'betternow@cesire.com.br',
      password: 'admin123',
      email_confirm: true
    });
    
    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      return;
    }
    
    console.log('Usuário criado no Auth:', authUser.user.id);
    
    // 2. Inserir na tabela admin_users usando o UUID do Auth
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        id: authUser.user.id,
        email: 'betternow@cesire.com.br',
        role: 'admin',
        created_at: new Date().toISOString(),
        last_login: null
      })
      .select();
    
    if (adminError) {
      console.error('Erro ao inserir na tabela admin_users:', adminError);
    } else {
      console.log('Usuário inserido na tabela admin_users:', adminData);
    }
    
    // 3. Testar login
    console.log('\nTestando login...');
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'betternow@cesire.com.br',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('Erro no login:', loginError);
    } else {
      console.log('Login bem-sucedido!');
      console.log('Usuário logado:', loginData.user.email);
      
      // Fazer logout
      await supabaseClient.auth.signOut();
      console.log('Logout realizado.');
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createAuthUser();