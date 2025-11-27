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
    initAuth();
  }, []);

  async function initAuth() {
    try {
      const token = authService.getStoredToken();
      const storedUser = authService.getStoredUser();

      if (!token) {
        setLoading(false);
        return;
      }

      if (storedUser) {
        setUser(storedUser);
        setLoading(false);

        try {
          const freshUser = await authService.getCurrentUser();
          setUser(freshUser);
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      } else {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      authService.logout();
      setUser(null);
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
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
      setUser(response.user);
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
