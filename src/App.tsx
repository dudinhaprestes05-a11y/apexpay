import { useState, useEffect } from 'react';
import { User, Seller } from './types';
import { api } from './lib/api';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { SellerDashboard } from './pages/SellerDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedSeller = localStorage.getItem('seller');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedSeller) {
          setSeller(JSON.parse(savedSeller));
        }
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch((import.meta.env.VITE_API_URL || '/api') + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao fazer login');
    }

    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    if (data.data.seller) {
      localStorage.setItem('seller', JSON.stringify(data.data.seller));
      setSeller(data.data.seller);
    }

    setUser(data.data.user);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setSeller(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === 'seller' && seller) {
    return <SellerDashboard user={user} seller={seller} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-lg text-gray-600 mb-4">Erro ao carregar dados do usuário</p>
        <button
          onClick={handleLogout}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Fazer login novamente
        </button>
      </div>
    </div>
  );
}
