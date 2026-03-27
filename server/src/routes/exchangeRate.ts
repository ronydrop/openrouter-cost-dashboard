import { Router, Request, Response } from 'express';
import { getExchangeRate, setManualRate, useAutoRate } from '../services/exchangeRate';

const router = Router();

// GET /api/exchange-rate
router.get('/', async (req: Request, res: Response) => {
  try {
    const currencyInfo = await getExchangeRate();
    res.json(currencyInfo);
  } catch (error: any) {
    console.error('Error in /api/exchange-rate:', error.message);
    res.status(500).json({
      error: 'Failed to get exchange rate',
      message: error.message,
    });
  }
});

// POST /api/exchange-rate
router.post('/', async (req: Request, res: Response) => {
  try {
    const { rate } = req.body;
    
    // If rate is 0 or not provided, use auto rate
    if (!rate || rate === 0) {
      useAutoRate();
    } else if (typeof rate === 'number' && rate > 0) {
      setManualRate(rate);
    }
    
    const currencyInfo = await getExchangeRate();
    res.json(currencyInfo);
  } catch (error: any) {
    console.error('Error in POST /api/exchange-rate:', error.message);
    res.status(500).json({
      error: 'Failed to update exchange rate',
      message: error.message,
    });
  }
});

export default router;
