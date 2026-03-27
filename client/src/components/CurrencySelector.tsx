interface CurrencySelectorProps {
  currency: 'USD' | 'BRL';
  onCurrencyChange: (currency: 'USD' | 'BRL') => void;
}

export function CurrencySelector({ currency, onCurrencyChange }: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Moeda:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onCurrencyChange('USD')}
          className={`px-3 py-1 text-sm rounded-md transition-all ${
            currency === 'USD'
              ? 'bg-white text-primary-600 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          USD
        </button>
        <button
          onClick={() => onCurrencyChange('BRL')}
          className={`px-3 py-1 text-sm rounded-md transition-all ${
            currency === 'BRL'
              ? 'bg-white text-primary-600 shadow-sm font-medium'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          BRL
        </button>
      </div>
    </div>
  );
}
