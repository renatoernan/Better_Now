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
  logout: () => void;
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
          .from('admin_users')
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
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        const userData: User = {
          id: data.user.id,
          email: data.user.email!,
          role: adminData.role
        };
        
        setUser(userData);
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
    const currentUser = user?.email || 'unknown';
    try {
      ActivityLogger.logAuth('logout_attempt', `Tentativa de logout para ${currentUser}`, 'info', { email: currentUser });
      await supabase.auth.signOut();
      setUser(null);
      ActivityLogger.logAuth('logout_success', `Logout realizado com sucesso para ${currentUser}`, 'success', { email: currentUser });
    } catch (error) {
      console.error('Logout error:', error);
      ActivityLogger.logAuth('logout_error', `Erro no logout: ${error}`, 'error', { email: currentUser, error: error.toString() });
      setUser(null);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          ActivityLogger.logAuth('session_check_error', `Erro ao verificar sessão: ${error}`, 'error', { error: error.toString() });
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Check if user is admin
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!adminError && adminData) {
            const userData: User = {
              id: session.user.id,
              email: session.user.email!,
              role: adminData.role
            };
            setUser(userData);
            ActivityLogger.logAuth('session_restored', `Sessão restaurada para ${session.user.email}`, 'info', { email: session.user.email, userId: session.user.id });
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        ActivityLogger.logAuth('session_check_error', `Erro ao verificar sessão: ${error}`, 'error', { error: error.toString() });
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          ActivityLogger.logAuth('auth_state_signed_out', 'Usuário desconectado', 'info');
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Check if user is admin
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!adminError && adminData) {
            const userData: User = {
              id: session.user.id,
              email: session.user.email!,
              role: adminData.role
            };
            setUser(userData);
            ActivityLogger.logAuth('auth_state_signed_in', `Usuário autenticado: ${session.user.email}`, 'success', { email: session.user.email, userId: session.user.id });
          }
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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