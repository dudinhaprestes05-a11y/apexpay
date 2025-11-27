import { api } from '../lib/api';
import { User } from '../types';

export interface LoginResponse {
  user: User;
  token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  document_cpf_cnpj: string;
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    if (response.success && response.data) {
      api.setToken(response.data.token);
      return response.data;
    }

    throw new Error(response.message || 'Erro ao fazer login');
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data);

    if (response.success && response.data) {
      api.setToken(response.data.token);
      return response.data;
    }

    throw new Error(response.message || 'Erro ao criar conta');
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao buscar usuário');
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refresh_token: string }> {
    const response = await api.post<{ token: string; refresh_token: string }>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );

    if (response.success && response.data) {
      api.setToken(response.data.token);
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar token');
  }

  logout(): void {
    api.setToken(null);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  getStoredToken(): string | null {
    return api.getToken();
  }

  getStoredRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  storeRefreshToken(token: string): void {
    localStorage.setItem('refresh_token', token);
  }
}

export const authService = new AuthService();
