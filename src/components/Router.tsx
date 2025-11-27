import { useAuth } from '../contexts/AuthContext';
import { Login } from '../pages/Login';
import { AdminDashboard } from '../pages/AdminDashboard';
import { SellerDashboard } from '../pages/SellerDashboard';

export function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  return <SellerDashboard />;
}
