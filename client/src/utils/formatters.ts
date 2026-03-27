import dayjs from 'dayjs';

export const formatCurrency = (value: number, currency: 'USD' | 'BRL' = 'USD'): string => {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

export const formatDate = (date: string | Date, format: string = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

export const format = (date: Date | string, formatStr: string = 'DD/MM/YYYY'): string => {
  return dayjs(date).format(formatStr);
};

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toLocaleString('pt-BR');
};

export const getDateRange = (range: string): { start: string; end: string } => {
  const today = dayjs();
  
  switch (range) {
    case 'today':
      return {
        start: today.startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'yesterday':
      return {
        start: today.subtract(1, 'day').startOf('day').toISOString(),
        end: today.subtract(1, 'day').endOf('day').toISOString(),
      };
    case 'last7days':
      return {
        start: today.subtract(7, 'day').startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'last30days':
      return {
        start: today.subtract(30, 'day').startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'currentMonth':
      return {
        start: today.startOf('month').toISOString(),
        end: today.endOf('day').toISOString(),
      };
    case 'previousMonth':
      return {
        start: today.subtract(1, 'month').startOf('month').toISOString(),
        end: today.subtract(1, 'month').endOf('month').toISOString(),
      };
    default:
      return {
        start: today.subtract(30, 'day').startOf('day').toISOString(),
        end: today.endOf('day').toISOString(),
      };
  }
};

export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};
