import { useState } from 'react';
import { DollarSign, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useExchangeRate, useUpdateExchangeRate } from '../hooks/useDashboard';

export function CurrencyRateCard() {
  const { data, isLoading, error } = useExchangeRate();
  const updateRate = useUpdateExchangeRate();
  const [manualRate, setManualRate] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleUpdateManualRate = () => {
    const rate = parseFloat(manualRate);
    if (rate > 0) {
      updateRate.mutate(rate);
      setShowManualInput(false);
      setManualRate('');
    }
  };

  const handleUseAutoRate = () => {
    updateRate.mutate(0);
  };

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-10 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card border-danger-200 bg-red-50">
        <div className="flex items-center text-danger-500">
          <AlertCircle size={20} className="mr-2" />
          <span className="font-medium">Erro ao carregar cotação</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <DollarSign className="text-primary-500 mr-2" size={20} />
          <h3 className="font-semibold text-gray-800">Cotação USD/BRL</h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          data.mode === 'auto' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-amber-100 text-amber-700'
        }`}>
          {data.mode === 'auto' ? 'Automática' : 'Manual'}
        </span>
      </div>
      
      <div className="text-3xl font-bold text-gray-900 mb-2">
        R$ {data.rate.toFixed(4)}
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Fonte: {data.source}
      </p>

      {!showManualInput ? (
        <button
          onClick={() => setShowManualInput(true)}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Definir cotação manual
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.0001"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="Ex: 5.00"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleUpdateManualRate}
              disabled={!manualRate || updateRate.isPending}
              className="btn btn-primary text-sm flex items-center gap-1"
            >
              {updateRate.isPending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Aplicar
            </button>
          </div>
          {data.mode === 'manual' && (
            <button
              onClick={handleUseAutoRate}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Voltar para cotação automática
            </button>
          )}
        </div>
      )}
    </div>
  );
}
