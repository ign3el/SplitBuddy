import { createWorker } from 'tesseract.js';
import type { OCRResult } from '../types';

const roundToTwo = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Basic image preprocessing to improve OCR on receipts
const fileToCanvas = async (imageFile: File | string): Promise<HTMLCanvasElement> => {
  const url = typeof imageFile === 'string' ? imageFile : URL.createObjectURL(imageFile);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxW = 1600; // downscale oversized images to a reasonable width
      const scale = Math.min(1, maxW / img.width);
      const width = Math.max(1, Math.floor(img.width * scale));
      const height = Math.max(1, Math.floor(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Draw image
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Enhance: grayscale + contrast boost
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const contrast = 1.25; // moderate contrast boost
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // luminance
        let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // contrast adjustment
        gray = (gray - 128) * contrast + 128;
        if (gray < 0) gray = 0; if (gray > 255) gray = 255;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);

      resolve();
      // Return canvas via closure
      (fileToCanvas as any).lastCanvas = canvas;
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
  return (fileToCanvas as any).lastCanvas as HTMLCanvasElement;
};

export const processReceiptImage = async (imageFile: File | string): Promise<OCRResult> => {
  const worker = await createWorker('eng');

  try {
    const canvas = await fileToCanvas(imageFile);
    let { data } = await (worker as any).recognize(canvas, {
      preserve_interword_spaces: 1,
      tessedit_pageseg_mode: 6,
      user_defined_dpi: 300,
    });

    // Fallback attempts if result seems empty/low confidence
    const isWeak = (data.text || '').trim().length < 10 || (data.confidence ?? 0) < 45;
    if (isWeak) {
      // Try a different PSM more tolerant to columns/sparse text
      data = (await (worker as any).recognize(canvas, {
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 4,
        user_defined_dpi: 300,
      })).data;
    }
    if (((data.text || '').trim().length < 10) || (data.confidence ?? 0) < 45) {
      data = (await (worker as any).recognize(canvas, {
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 11,
        user_defined_dpi: 300,
      })).data;
    }

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
