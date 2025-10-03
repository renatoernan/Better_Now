import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../shared/contexts/contexts/AuthContext';
import { toast } from 'sonner';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Se ainda estiver carregando, mostrar loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se já estiver autenticado, redirecionar para o painel
  if (isAuthenticated) {
    return <Navigate to="/admin/panel" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Email ou senha inválidos. Verifique se você tem permissões de administrador.');
        toast.error('Erro no login', {
          description: 'Email ou senha inválidos. Verifique se você tem permissões de administrador.',
          duration: 6000
        });
      } else {
        toast.success('Login realizado com sucesso!', {
          description: 'Redirecionando para o painel administrativo...',
          duration: 3000
        });
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro durante o login. Tente novamente.',
        duration: 6000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="/images/logo_better_now.png" 
              alt="Better Now - Logotipo da empresa" 
              className="mx-auto h-32 w-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Área Administrativa
            </h1>
            <p className="text-gray-600">
              Faça login para acessar o painel administrativo
            </p>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-labelledby="login-title">
            <h2 id="login-title" className="sr-only">Formulário de Login Administrativo</h2>
            {error && (
              <div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Digite seu email"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Digite sua senha"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              aria-describedby={isLoading ? 'login-loading' : undefined}
            >
              {isLoading ? (
                <>
                  <span aria-hidden="true">Entrando...</span>
                  <span id="login-loading" className="sr-only">Processando login, aguarde</span>
                </>
              ) : (
                'Entrar'
              )}
            </button>

            {/* Botão Provisório para Acesso Admin */}
            <button
              type="button"
              onClick={() => navigate('/admin/panel?temp=true')}
              className="w-full mt-3 bg-transparent border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none flex items-center justify-center gap-2"
              aria-label="Acesso provisório ao painel administrativo - apenas para desenvolvimento"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              🚧 Acesso Provisório Admin
            </button>
          </form>

          {/* Informações */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <strong>Acesso Restrito:</strong><br />
              Apenas usuários cadastrados como administradores podem acessar esta área.
            </p>
          </div>

          {/* Aviso do Botão Provisório */}
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-700 text-center flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <strong>Botão Provisório:</strong> O acesso direto será removido em produção.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;