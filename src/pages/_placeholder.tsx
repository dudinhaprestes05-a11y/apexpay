import { AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Backend PHP Necessário
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Esta página requer que o backend PHP esteja rodando.
            Por favor, configure e inicie o servidor PHP conforme as instruções.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
            <p className="text-sm font-medium text-gray-900 mb-2">Passos rápidos:</p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Configure o banco de dados MySQL</li>
              <li>Edite <code className="bg-gray-200 px-1 rounded">backend/.env</code></li>
              <li>Execute <code className="bg-gray-200 px-1 rounded">php backend/migrate.php</code></li>
              <li>Crie admin: <code className="bg-gray-200 px-1 rounded">php backend/create-admin.php</code></li>
              <li>Inicie: <code className="bg-gray-200 px-1 rounded">php -S localhost:8000 -t backend/public</code></li>
            </ol>
            <p className="text-xs text-gray-500 mt-3">
              Consulte <code className="bg-gray-200 px-1 rounded">PHP_BACKEND_SETUP.md</code> para instruções completas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
