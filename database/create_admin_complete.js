import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://litkotytghgibtqyjzgf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdGtvdHl0Z2hnaWJ0cXlqemdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU1NTk3MiwiZXhwIjoyMDUwMTMxOTcyfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('Criando usuário admin completo...');
    
    // 1. Criar usuário no Supabase Auth
    console.log('1. Criando usuário no Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'betternow@cesire.com.br',
      password: 'admin123',
      email_confirm: true
    });
    
    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      return;
    }
    
    console.log('Usuário criado no Auth:', authUser.user.id);
    
    // 2. Inserir na tabela admin_users
    console.log('2. Inserindo na tabela admin_users...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: authUser.user.id,
        email: 'betternow@cesire.com.br',
        role: 'admin',
        created_at: new Date().toISOString(),
        last_login: null
      });
    
    if (adminError) {
      console.error('Erro ao inserir na tabela admin_users:', adminError);
    } else {
      console.log('Usuário admin criado com sucesso!');
    }
    
    // 3. Testar login
    console.log('3. Testando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'betternow@cesire.com.br',
      password: 'admin123'
    });
    
    if (loginError) {
      console.error('Erro no teste de login:', loginError);
    } else {
      console.log('Login teste bem-sucedido!');
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

createAdminUser();