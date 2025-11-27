import { AuthProvider } from './contexts/AuthContext';
import { Router } from './components/Router';

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
