const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_SERVICE_ROLE_KEY não encontrados no arquivo .env");
    process.exit(1);
}

// Inicializa o cliente com a SERVICE ROLE KEY (bypass automático do RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function createAdmin() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("\n⚠️  Uso incorreto!");
        console.log("👉 Digite: node scripts/create_admin.cjs <seu_email> <sua_senha>\n");
        process.exit(1);
    }

    const email = args[0];
    const password = args[1];

    console.log(`\n⏳ Iniciando criação do administrador: ${email}...`);

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // Já confirma o e-mail no ato
    });

    if (authError) {
        // Se o usuário já existir, tentar recuperá-lo
        if (authError.message.includes("already registered")) {
            console.log("ℹ️  O email já está registrado no Auth! Vamos apenas promovê-lo a Admin da tabela.");
            // Tentar promover um já existente
            await promoteExistingUser(email);
            return;
        } else {
            console.error("❌ Erro na criação do Auth:", authError.message);
            process.exit(1);
        }
    }

    const userId = authData.user.id;
    console.log(`✅ Autenticação criada com sucesso (ID: ${userId})`);

    // 2. Inserir o ID na nova tabela de Admins
    const { error: dbError } = await supabase
        .from('app_admin_users')
        .insert([
            {
                id: userId,
                email: email,
                role: 'admin',
                active: true
            }
        ]);

    if (dbError) {
        console.error("❌ Erro ao salvar na tabela 'app_admin_users':", dbError.message);
    } else {
        console.log(`🎉 Sucesso total! O administrador [${email}] foi inserido e possui todas as permissões no banco de dados.\n`);
    }
}

async function promoteExistingUser(email) {
    // Puxar IDs (workaround via Admin API listing ou tentar forçar a criação se falhar e pegar ID... como não temos getAllUsers fácil por email, deixaremos simples)
    // O script anterior que passava a lista de 'auth' já cuida disso no SQL.
    console.log("ℹ️ Como o email já existe, lembre-se de rodar aquele script SQL `config_admin_users.sql` para garantir que a permissão de tabela foi ativada.\n");
}

createAdmin();
