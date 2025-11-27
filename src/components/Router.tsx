import { ReactNode, createContext, useContext, useState } from 'react';

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/');

  const navigate = (path: string) => {
    setCurrentPath(path);
  };

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
}

interface RouteProps {
  path: string;
  component: ReactNode;
}

export function Route({ path, component }: RouteProps) {
  const { currentPath } = useRouter();
  return currentPath === path ? <>{component}</> : null;
}

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

export function Link({ to, children, className = '' }: LinkProps) {
  const { navigate } = useRouter();

  return (
    <button onClick={() => navigate(to)} className={className}>
      {children}
    </button>
  );
}
