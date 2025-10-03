import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Users, Calendar, Settings, LogOut, Menu, X, MessageSquare, Mail } from 'lucide-react';
import { useAuth } from '../../shared/contexts/contexts/AuthContext';
import { toast } from 'sonner';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logout realizado com sucesso!', {
        description: 'Até logo!'
      });
      navigate('/admin/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: Menu,
    },
    {
      name: 'Clientes',
      path: '/admin/clients',
      icon: Users,
    },
    {
      name: 'Eventos',
      path: '/admin/events',
      icon: Calendar,
    },
    {
      name: 'Solicitações',
      path: '/admin/solicitations',
      icon: Mail,
    },
    {
      name: 'Depoimentos',
      path: '/admin/testimonials',
      icon: MessageSquare,
    },
    {
      name: 'Configurações',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 border-b border-gray-200">
          <div className="flex items-center min-w-0">
            <img 
              src="/images/logo_better_now.png" 
              alt="Better Now" 
              className="h-6 sm:h-8 w-auto flex-shrink-0"
            />
            <span className="ml-2 text-lg sm:text-xl font-semibold text-gray-800 truncate">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <nav className="mt-4 sm:mt-8 px-3 sm:px-4">
          <ul className="space-y-1 sm:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">Sair</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 flex-shrink-0"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <div className="flex items-center min-w-0">
              <img 
                src="/images/logo_better_now.png" 
                alt="Better Now" 
                className="h-6 sm:h-8 w-auto flex-shrink-0"
              />
              <span className="ml-2 text-base sm:text-lg font-semibold text-gray-800 truncate">Admin</span>
            </div>
            <div className="w-8 sm:w-10 flex-shrink-0"></div> {/* Spacer */}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;