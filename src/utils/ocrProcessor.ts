import { createWorker } from 'tesseract.js';
import type { OCRResult } from '../types';

const roundToTwo = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Basic image preprocessing to improve OCR on receipts
const fileToCanvas = async (imageFile: File | string, rotateDeg = 0): Promise<HTMLCanvasElement> => {
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
      // Account for rotation by expanding canvas
      const rad = (rotateDeg * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const rW = Math.floor(width * cos + height * sin);
      const rH = Math.floor(height * cos + width * sin);

      canvas.width = rW;
      canvas.height = rH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Draw rotated image centered
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(rW / 2, rH / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
      ctx.rotate(-rad);
      ctx.translate(-rW / 2, -rH / 2);

      // Enhance: grayscale + contrast boost + Otsu binarization
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const contrast = 1.25; // moderate contrast boost
      const histogram = new Array<number>(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // luminance
        let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // contrast adjustment
        gray = (gray - 128) * contrast + 128;
        if (gray < 0) gray = 0; if (gray > 255) gray = 255;
        const gi = gray | 0;
        histogram[gi]++;
        data[i] = data[i + 1] = data[i + 2] = gi;
      }

      // Otsu threshold
      const total = width * height;
      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * histogram[t];
      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let varMax = 0;
      let threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        wF = total - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > varMax) {
          varMax = between;
          threshold = t;
        }
      }

      // Apply binarization
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i];
        const bw = v > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = bw;
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
    // Try several small deskew angles and pick the best
    const angles = [-6, -3, 0, 3, 6];
    let best = { angle: 0, score: -Infinity, canvas: await fileToCanvas(imageFile, 0) };
    for (const angle of angles) {
      const c = await fileToCanvas(imageFile, angle);
      const quick = await (worker as any).recognize(c, {
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 6,
        user_defined_dpi: 300,
      });
      const textLen = (quick.data.text || '').trim().length;
      const score = (quick.data.confidence ?? 0) + Math.min(textLen / 50, 20); // blend confidence and length
      if (score > best.score) best = { angle, score, canvas: c };
    }
    const canvas = best.canvas;
    let { data } = await (worker as any).recognize(canvas, {
      preserve_interword_spaces: 1,
      tessedit_pageseg_mode: 6,
      user_defined_dpi: 300,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.$-:,/% ' ,
    });

    // Fallback attempts if result seems empty/low confidence
    const isWeak = (data.text || '').trim().length < 10 || (data.confidence ?? 0) < 45;
    if (isWeak) {
      // Try a different PSM more tolerant to columns/sparse text
      data = (await (worker as any).recognize(canvas, {
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 4,
        user_defined_dpi: 300,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.$-:,/% ' ,
      })).data;
    }


    if (((data.text || '').trim().length < 10) || (data.confidence ?? 0) < 45) {
      data = (await (worker as any).recognize(canvas, {
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 11,
        user_defined_dpi: 300,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.$-:,/% ' ,
      })).data;
    }
    if (((data.text || '').trim().length < 10) || (data.confidence ?? 0) < 45) {
      // Try orientation/script detection
      data = (await (worker as any).recognize(canvas, {
        preserve_interword_spaces: 1,
        tessedit_pageseg_mode: 0,
        user_defined_dpi: 300,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.$-:,/% ' ,
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

export const processReceiptImages = async (imageFiles: Array<File | string>): Promise<OCRResult> => {
  // Process multiple images by running the single-image pipeline and concatenating results
  let combinedText = '';
  const confidences: number[] = [];
  for (const file of imageFiles) {
    const single = await processReceiptImage(file);
    if (single.text) {
      combinedText += (combinedText ? '\n' : '') + single.text;
      if (typeof single.confidence === 'number') confidences.push(single.confidence);
    }
  }
  const avgConfidence = confidences.length ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;
  return { text: combinedText, confidence: avgConfidence };
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
