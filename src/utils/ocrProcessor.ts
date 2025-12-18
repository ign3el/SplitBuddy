import { createWorker } from 'tesseract.js';
import type { OCRResult } from '../types';

const roundToTwo = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const processReceiptImage = async (imageFile: File | string): Promise<OCRResult> => {
  const worker = await createWorker('eng');
  
  try {
    const { data } = await worker.recognize(imageFile);
    return {
      text: data.text,
      confidence: data.confidence,
    };
  } finally {
    await worker.terminate();
  }
};

export const parseReceiptText = (text: string): { items: Array<{ description: string; price: number }>, subtotal?: number, tax?: number, total?: number } => {
  const lines = text.split('\n').filter(line => line.trim());
  const items: Array<{ description: string; price: number }> = [];
  let subtotal: number | undefined;
  let tax: number | undefined;
  let total: number | undefined;

  // Regex to match prices (e.g., $12.99, 12.99, etc.)
  const priceRegex = /\$?\d+\.\d{2}/g;

  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Check for special lines
    if (lowerLine.includes('subtotal')) {
      const match = line.match(priceRegex);
      if (match) subtotal = roundToTwo(parseFloat(match[match.length - 1].replace('$', '')));
    } else if (lowerLine.includes('tax')) {
      const match = line.match(priceRegex);
      if (match) tax = roundToTwo(parseFloat(match[match.length - 1].replace('$', '')));
    } else if (lowerLine.includes('total')) {
      const match = line.match(priceRegex);
      if (match) total = roundToTwo(parseFloat(match[match.length - 1].replace('$', '')));
    } else {
      // Try to parse as item line
      const prices = line.match(priceRegex);
      if (prices && prices.length > 0) {
        const price = roundToTwo(parseFloat(prices[prices.length - 1].replace('$', '')));
        const description = line.substring(0, line.lastIndexOf(prices[prices.length - 1])).trim();
        
        if (description && price > 0 && price < 1000) {
          items.push({ description, price });
        }
      }
    }
  });

  return { items, subtotal, tax, total };
};
