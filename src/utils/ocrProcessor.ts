import { createWorker } from 'tesseract.js';
import type { OCRResult } from '../types';

const roundToTwo = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const compressImageFile = async (file: File, maxWidth = 1400, quality = 0.7): Promise<File> => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for compression'));
    image.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.max(1, Math.floor(img.width * scale));
  const height = Math.max(1, Math.floor(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available for compression');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => {
        if (b) resolve(b);
        else reject(new Error('Compression failed'));
      },
      'image/jpeg',
      quality
    );
  });

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-compressed.jpg', { type: 'image/jpeg' });
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

/**
 * Enhanced receipt parser with OCR noise handling and comprehensive keyword detection.
 * Extracts total, tax, tip, and itemized line items with quantities from raw OCR text.
 */
export const parseReceiptData = (rawText: string): {
  total: number;
  tax: number;
  tip: number;
  items: Array<{ desc: string; quantity: number; price: number }>;
} => {
  // Step 1: Cleaning - Remove OCR noise
  let cleanedText = rawText
    .replace(/[|]/g, ' ') // Remove pipes
    .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs but keep newlines for line parsing
    .replace(/[o0](?=\.\d{2})/gi, '0') // Fix misread zeros near decimals
    .replace(/[sS]\s*(?=\d)/g, '$') // Fix misread dollar signs
    .replace(/[il]\s*(?=\d)/gi, '1') // Fix misread 1s
    .replace(/([A-Z])\s+\1+/g, '$1') // Remove duplicate letters (e.g., "CC" -> "C")
    .replace(/\b([A-Z])\s+([A-Z])\b/g, '$1$2') // Remove spaces between letters (e.g., "H E" -> "HE")
    .trim();

  const lines = cleanedText
    .split(/\r?\n/) // preserve original line structure for item parsing
    .map(l => l.trim())
    .filter(line => line.length > 0);

  // Price regex: matches $12.99, 12.99, AED 12.99, etc.
  const priceRegex = /(?:AED|USD|[$€£¥])\s*(\d+\.?\d{0,2})|(\d+\.\d{2})/gi;

  // Step 2: Keyword mapping for Total, Tax, Tip
  const totalKeywords = /\b(total|amount\s*due|grand\s*total|balance|net\s*amount|final|sum)\b/i;
  const taxKeywords = /\b(sales\s*tax|tax|vat|gst|service\s*tax)\b/i;
  const tipKeywords = /\b(tip|gratuity|service\s*charge|service)\b/i;

  const foundTotals: Array<{ value: number; lineIndex: number }> = [];
  let taxValue: number | undefined;
  let tipValue: number | undefined;
  const items: Array<{ desc: string; quantity: number; price: number }> = [];
  const allPrices: number[] = [];

  // Step 3: Parse lines
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    const priceMatches = Array.from(line.matchAll(priceRegex));

    if (priceMatches.length === 0) return;

    // Extract the last price from the line (most likely the amount)
    const lastMatch = priceMatches[priceMatches.length - 1];
    const priceStr = lastMatch[1] || lastMatch[2];
    const price = roundToTwo(parseFloat(priceStr));

    if (isNaN(price) || price <= 0) return;

    allPrices.push(price);

    // Check for Total keywords
    if (totalKeywords.test(lowerLine)) {
      foundTotals.push({ value: price, lineIndex: index });
    }
    // Check for Tax keywords
    else if (taxKeywords.test(lowerLine) && !taxValue) {
      taxValue = price;
    }
    // Check for Tip keywords
    else if (tipKeywords.test(lowerLine) && !tipValue) {
      tipValue = price;
    }
    // Try to parse as item line with quantity pattern
    else {
      // Pattern: [Quantity] [Description] [Price]
      // Example: "2 Coffee 5.99" or "1x Burger 12.50"
      const quantityPattern = /^(\d+)\s*[xX*]?\s+(.+?)\s+(?:AED|USD|[$€£¥])?\s*(\d+\.?\d{0,2})$/i;
      const qtyMatch = line.match(quantityPattern);

      if (qtyMatch) {
        const qty = parseInt(qtyMatch[1], 10);
        const desc = qtyMatch[2].trim();
        const itemPrice = roundToTwo(parseFloat(qtyMatch[3]));

        if (desc && desc.length > 1 && qty > 0 && itemPrice > 0 && itemPrice < 1000) {
          items.push({ desc, quantity: qty, price: itemPrice });
        }
      } else {
        // Fallback: treat as single item without explicit quantity
        const descEndIndex = line.lastIndexOf(lastMatch[0]);
        let description = line.substring(0, descEndIndex).trim();

        // Remove leading quantity if present (e.g., "1 " or "2x ")
        description = description.replace(/^\d+\s*[xX*]?\s+/, '').trim();

        // Filter out lines that look like totals/subtotals/tax/payment-related
        const isSpecialLine = /\b(subtotal|sub\s*total|discount|change|payment|due|charged|balance|thank|you|welcome|receipt|store|date|time|hour|minute|cashier|register|phone|address)\b/i.test(lowerLine);
        
        // Also filter out lines that are too short (likely headers/footers)
        const isTooShort = description.length < 2;

        if (description && price > 0 && price < 1000 && !isSpecialLine && !isTooShort) {
          items.push({ desc: description, quantity: 1, price });
        }
      }
    }
  });

  // Step 4: "Last Price" Logic for Total
  let finalTotal: number;

  if (foundTotals.length > 0) {
    // Prioritize the one closest to the end, or the largest if multiple
    const sortedByIndex = [...foundTotals].sort((a, b) => b.lineIndex - a.lineIndex);
    const candidate = sortedByIndex[0];

    // If there's a tie, pick the largest
    const maxTotal = Math.max(...foundTotals.map(t => t.value));
    finalTotal = candidate.value >= maxTotal ? candidate.value : maxTotal;
  } else {
    // Step 5: Edge Case Handling - sum all prices and return highest
    if (allPrices.length > 0) {
      const summedTotal = roundToTwo(allPrices.reduce((sum, p) => sum + p, 0));
      const maxPrice = Math.max(...allPrices);
      // Use the larger of summed or max as suggested total
      finalTotal = maxPrice > summedTotal * 0.5 ? maxPrice : summedTotal;
    } else {
      finalTotal = 0;
    }
  }

  // Step 6: Validation - return structured object
  return {
    total: finalTotal,
    tax: taxValue ?? 0,
    tip: tipValue ?? 0,
    items,
  };
};

// Legacy function for backward compatibility
export const parseReceiptText = (text: string): { items: Array<{ description: string; price: number }>, subtotal?: number, tax?: number, total?: number } => {
  const parsed = parseReceiptData(text);
  return {
    items: parsed.items.map(item => ({ description: item.desc, price: item.price })),
    subtotal: undefined,
    tax: parsed.tax || undefined,
    total: parsed.total || undefined,
  };
};
