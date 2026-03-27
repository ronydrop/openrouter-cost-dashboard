import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

let manualRate: number | null = null;
let fallbackRate = parseFloat(process.env.FALLBACK_USD_BRL_RATE || '5.00');

export interface CurrencyInfo {
  rate: number;
  source: string;
  mode: 'auto' | 'manual';
  lastUpdated: string;
}

export async function getExchangeRate(): Promise<CurrencyInfo> {
  // Return manual rate if set
  if (manualRate !== null) {
    return {
      rate: manualRate,
      source: 'Manual',
      mode: 'manual',
      lastUpdated: new Date().toISOString(),
    };
  }

  // Check cache first
  const cached = cache.get<CurrencyInfo>('exchangeRate');
  if (cached) {
    return cached;
  }

  const apiUrl = process.env.EXCHANGE_RATE_API_URL;

  if (!apiUrl) {
    console.log('No exchange rate API configured, using fallback rate');
    const result: CurrencyInfo = {
      rate: fallbackRate,
      source: 'Fallback (configurado)',
      mode: 'auto',
      lastUpdated: new Date().toISOString(),
    };
    cache.set('exchangeRate', result);
    return result;
  }

  try {
    const response = await axios.get(apiUrl, { timeout: 5000 });
    const rate = response.data?.rates?.BRL || response.data?.rates?.brl;

    if (rate) {
      const result: CurrencyInfo = {
        rate: parseFloat(rate),
        source: 'API Exchangerate',
        mode: 'auto',
        lastUpdated: new Date().toISOString(),
      };
      cache.set('exchangeRate', result);
      return result;
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
  }

  // Fallback to default rate
  const result: CurrencyInfo = {
    rate: fallbackRate,
    source: 'Fallback (padrão)',
    mode: 'auto',
    lastUpdated: new Date().toISOString(),
  };
  cache.set('exchangeRate', result);
  return result;
}

export function setManualRate(rate: number): void {
  if (rate > 0) {
    manualRate = rate;
    cache.del('exchangeRate');
  }
}

export function useAutoRate(): void {
  manualRate = null;
  cache.del('exchangeRate');
}

export function getManualRate(): number | null {
  return manualRate;
}

export function convertToBrl(usdAmount: number, rate?: number): number {
  const exchangeRate = rate ?? fallbackRate;
  return usdAmount * exchangeRate;
}
