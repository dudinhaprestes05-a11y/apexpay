import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from './Router';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Webhook,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  Key,
  BookOpen,
  FileText,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { Button } from './ui/Button';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: any;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'seller'] },
  { label: 'Sellers', icon: Users, path: '/sellers', roles: ['admin'] },
  { label: 'Adquirentes', icon: Building2, path: '/acquirers', roles: ['admin'] },
  { label: 'Aprovações KYC', icon: CheckCircle, path: '/kyc-approvals', roles: ['admin'] },
  { label: 'Transações', icon: CreditCard, path: '/transactions', roles: ['admin', 'seller'] },
  { label: 'Webhooks', icon: Webhook, path: '/webhooks', roles: ['admin'] },
  { label: 'Config Global', icon: Settings, path: '/global-config', roles: ['admin'] },
  { label: 'Minha Carteira', icon: Wallet, path: '/wallet', roles: ['seller'] },
  { label: 'Minhas Chaves API', icon: Key, path: '/api-keys', roles: ['seller'] },
  { label: 'Documentação', icon: BookOpen, path: '/documentation', roles: ['seller'] },
  { label: 'Meus Documentos', icon: FileText, path: '/my-documents', roles: ['seller'] },
];

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { currentPath, navigate } = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || '')
  );

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  function handleNavigation(path: string) {
    navigate(path);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h1 className="text-xl font-bold text-blue-600">Apex Pay</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <nav className="space-y-1 px-3">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <div className="mt-2">
                  {user?.role === 'seller' && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      Seller
                    </span>
                  )}
                  {user?.role === 'admin' && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="w-full flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 lg:hidden">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Apex Pay</h1>
              <div className="w-6" />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
