import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, RegisterData } from '../services/auth.service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const token = authService.getStoredToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error checking user:', error);
      authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      console.log('Attempting sign in for:', email);
      const response = await authService.login(email, password);

      authService.storeRefreshToken(response.refresh_token);
      setUser(response.user);

      console.log('Login successful');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function signUp(email: string, password: string, name: string) {
    try {
      const registerData: RegisterData = {
        email,
        password,
        name,
        document_cpf_cnpj: '',
      };

      const response = await authService.register(registerData);

      authService.storeRefreshToken(response.refresh_token);
      setUser(response.user);

      console.log('Registration successful');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async function refreshUser() {
    try {
      if (!user) return;

      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
