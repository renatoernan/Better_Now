import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../services/lib/supabase';
import { ActivityLogger } from '../../utils/utils/activityLogger';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      ActivityLogger.logAuth('login_attempt', `Tentativa de login para ${email}`, 'info', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        ActivityLogger.logAuth('login_failed', `Falha no login para ${email}: ${error.message}`, 'error', { email, error: error.message });
        return false;
      }

      if (data.user) {
        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
          .from('app_admin_users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (adminError || !adminData) {
          console.error('User is not an admin');
          await supabase.auth.signOut();
          ActivityLogger.logAuth('login_failed', `Falha no login para ${email}: User is not an admin`, 'error', { email });
          return false;
        }

        // Update last login
        await supabase
          .from('app_admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        const userData: User = {
          id: data.user.id,
          email: data.user.email!,
          role: adminData.role
        };

        setUser(userData);
        setLoading(false);
        ActivityLogger.logAuth('login_success', `Login realizado com sucesso para ${email}`, 'success', { email, userId: data.user.id });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      ActivityLogger.logAuth('login_error', `Erro no sistema de login: ${error}`, 'error', { email, error: error.toString() });
      return false;
    }
  };

  const logout = async () => {
    let currentUser = user?.email || 'unknown';

    try {
      if (currentUser === 'unknown') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          currentUser = session.user.email;
        }
      }

      ActivityLogger.logAuth('logout_attempt', `Tentativa de logout para ${currentUser}`, 'info', { email: currentUser });
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
      ActivityLogger.logAuth('logout_success', `Logout realizado com sucesso para ${currentUser}`, 'success', { email: currentUser });
    } catch (error) {
      console.error('Logout error:', error);
      ActivityLogger.logAuth('logout_error', `Erro no logout: ${error}`, 'error', { email: currentUser, error: error.toString() });
      setUser(null);
      setLoading(false);
    }
  };

  // Check for existing session on mount with non-blocking initialization & failsafe timeout
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: 'admin'
            });

            // Asynchronously verify role without blocking UI rendering
            (async () => {
              try {
                const { data: adminData } = await supabase
                  .from('app_admin_users')
                  .select('role')
                  .eq('id', session.user.id)
                  .maybeSingle();

                if (mounted && adminData?.role) {
                  setUser(prev => prev ? { ...prev, role: adminData.role } : prev);
                }
              } catch (err) {
                console.warn('Erro ao atualizar role de admin:', err);
              }
            })();
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Erro na inicialização da autenticação:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          ActivityLogger.logAuth('auth_state_signed_out', 'Usuário desconectado', 'info');
          setLoading(false);
        } else if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            role: 'admin'
          });

          // Asynchronously verify role
          (async () => {
            try {
              const { data: adminData } = await supabase
                .from('app_admin_users')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle();

              if (mounted && adminData?.role) {
                setUser(prev => prev ? { ...prev, role: adminData.role } : prev);
              }
            } catch (err) {
              console.warn('Erro ao verificar role no onAuthStateChange:', err);
            }
          })();

          if (event === 'SIGNED_IN') {
            ActivityLogger.logAuth('auth_state_signed_in', `Usuário autenticado: ${session.user.email}`, 'success', { email: session.user.email, userId: session.user.id });
          } else if (event === 'INITIAL_SESSION') {
            ActivityLogger.logAuth('session_restored', `Sessão restaurada para ${session.user.email}`, 'info', { email: session.user.email, userId: session.user.id });
          }

          setLoading(false);
        }
      }
    );

    // Failsafe timeout to prevent permanent loading spinners
    const failsafeTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};