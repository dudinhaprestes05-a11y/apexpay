import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RouterProvider, Route } from './components/Router';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { KYCApprovals } from './pages/admin/KYCApprovals';
import { Webhooks } from './pages/admin/Webhooks';
import { Sellers } from './pages/admin/Sellers';
import { Acquirers } from './pages/admin/Acquirers';
import { GlobalConfig } from './pages/admin/GlobalConfig';
import { AllTransactions } from './pages/admin/AllTransactions';
import { SellerDashboard } from './pages/seller/Dashboard';
import { Wallet } from './pages/seller/Wallet';
import { ApiKeys } from './pages/seller/ApiKeys';
import { Documentation } from './pages/seller/Documentation';
import { MyDocuments } from './pages/seller/MyDocuments';
import { Transactions } from './pages/Transactions';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Route
        path="/"
        component={
          user.role === 'admin' ? <AdminDashboard /> : <SellerDashboard />
        }
      />
      <Route path="/sellers" component={<Sellers />} />
      <Route path="/acquirers" component={<Acquirers />} />
      <Route path="/kyc-approvals" component={<KYCApprovals />} />
      <Route path="/webhooks" component={<Webhooks />} />
      <Route path="/global-config" component={<GlobalConfig />} />
      <Route
        path="/transactions"
        component={user.role === 'admin' ? <AllTransactions /> : <Transactions />}
      />
      <Route path="/wallet" component={<Wallet />} />
      <Route path="/api-keys" component={<ApiKeys />} />
      <Route path="/documentation" component={<Documentation />} />
      <Route path="/my-documents" component={<MyDocuments />} />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </AuthProvider>
  );
}

export default App;
