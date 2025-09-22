import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Verifica se há parâmetro temp=true para acesso temporário
  const searchParams = new URLSearchParams(location.search);
  const isTempAccess = searchParams.get('temp') === 'true';
  
  // Para desenvolvimento: permitir acesso sem autenticação
  // TODO: Remover esta linha em produção
  const isDevelopment = true;

  if (!isAuthenticated && !isTempAccess && !isDevelopment) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;