import { useEffect, useMemo, useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { ParticipantManager } from './components/ParticipantManager';
import { ItemAssignment } from './components/ItemAssignment';
import { Results } from './components/Results';
import { Auth } from './components/Auth';
import { Pricing } from './components/Pricing';
import { UserMenu } from './components/UserMenu';
import { FeaturesComparison } from './components/FeaturesComparison';
import ScanCounter from './components/ScanCounter';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { AdWrapper } from './components/AdWrapper';
import type { Participant, ReceiptItem, SplitRecord, DetailedSplit } from './types';
import { processReceiptImages, parseReceiptData, compressImageFile } from './utils/ocrProcessor';
import { calculateParticipantTotals, generateId } from './utils/calculations';
import { checkAccess } from './utils/accessControl';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const subscription = useSubscription();
  const [showPricingRedirect, setShowPricingRedirect] = useState(false);

  // Show auth if not logged in
  if (!subscription.isLoggedIn) {
    return <Auth />;
  }

  // Show pricing if redirected from access denial
  if (showPricingRedirect) {
    return (
      <div className="app">
        <button
          className="back-to-app-btn"
          onClick={() => setShowPricingRedirect(false)}
          style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 1000 }}
        >
          ← Back to App
        </button>
        <Pricing />
      </div>
    );
  }

  // Otherwise show main app
  return <AppMainContent onPricingRedirect={() => setShowPricingRedirect(true)} />;
}

function AppMainContent({ onPricingRedirect }: { onPricingRedirect: () => void }) {
  const subscription = useSubscription();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [tip, setTip] = useState(0);
  const [customTotals, setCustomTotals] = useState<Record<string, number>>({});
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [splitHistory, setSplitHistory] = useState<SplitRecord[]>([]);
  const [detailedSplits, setDetailedSplits] = useState<DetailedSplit[]>([]);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info'; dismissible?: boolean; autoCloseMs?: number } | null>(null);
  const [currentStep, setCurrentStep] = useState<'scan' | 'participants' | 'assign' | 'results'>('scan');

  const mergeItemsByName = (list: ReceiptItem[]): ReceiptItem[] => {
    const byName = new Map<string, ReceiptItem>();

    list.forEach(item => {
      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const key = item.description.trim().toLowerCase();
      const existing = byName.get(key);

      if (!existing) {
        byName.set(key, { ...item, quantity: qty, assignedTo: [...item.assignedTo] });
        return;
      }

      const totalQty = existing.quantity + qty;
      const totalPrice = existing.price * existing.quantity + item.price * qty;
      const unitPrice = Math.round((totalPrice / totalQty) * 100) / 100;
      const mergedAssignedTo = Array.from(new Set([...existing.assignedTo, ...item.assignedTo]));
      const isShared = mergedAssignedTo.length > 1 || existing.isShared || item.isShared;

      byName.set(key, {
        ...existing,
        price: unitPrice,
        quantity: totalQty,
        assignedTo: mergedAssignedTo,
        isShared,
      });
    });

    return Array.from(byName.values());
  };

  const handleItemsChange = (nextItems: ReceiptItem[]) => {
    setItems(mergeItemsByName(nextItems));
  };

  useEffect(() => {
    const loadHistory = async () => {
      // Only load history if user is logged in
      if (!subscription.isLoggedIn) return;
      
      // Check if this is first login
      const hasSeenFeatures = localStorage.getItem('splitbuddy_features_shown');
      if (!hasSeenFeatures) {
        setShowFeatures(true);
        localStorage.setItem('splitbuddy_features_shown', 'true');
      }
      
      try {
        const { records, detailedSplits: detailed } = await subscription.getSplitHistory();
        setSplitHistory(records);
        setDetailedSplits(detailed);
        const uniqueNames = Array.from(new Set(records.map(r => r.name)));
        setSavedNames(uniqueNames);
      } catch (error) {
        console.error('Error loading history from server', error);
        // Silently fail - user can still use the app without history
      }
    };
    loadHistory();
  }, [subscription.isLoggedIn]);

  useEffect(() => {
    setCustomTotals(prev => {
      const updated: Record<string, number> = {};
      participants.forEach(p => {
        if (prev[p.id] !== undefined) {
          updated[p.id] = prev[p.id];
        }
      });
      return updated;
    });
  }, [participants]);

  const persistRecords = async (newRecords: SplitRecord[], detailedSplit: DetailedSplit) => {
    try {
      await subscription.saveSplitHistory(newRecords, detailedSplit);
      const merged = [...splitHistory, ...newRecords];
      setSplitHistory(merged);
      const uniqueNames = Array.from(new Set(merged.map(r => r.name)));
      setSavedNames(uniqueNames);
      const mergedDetailed = [...detailedSplits, detailedSplit];
      setDetailedSplits(mergedDetailed);
    } catch (error) {
      console.error('Error saving records', error);
      throw error;
    }
  };

  const applyParsedReceipt = (parsedData: ReturnType<typeof parseReceiptData>) => {
    const newItems: ReceiptItem[] = parsedData.items.map(item => ({
      id: generateId(),
      description: item.desc,
      price: item.price,
      quantity: item.quantity,
      assignedTo: [],
      isShared: false,
    }));

    handleItemsChange(newItems);
    setCustomTotals({});

    // Apply tax and tip if detected
    if (parsedData.tax > 0) {
      // Convert tax amount to percentage based on item total
      const itemsTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (itemsTotal > 0) {
        const taxPercent = Math.round((parsedData.tax / itemsTotal) * 100 * 100) / 100;
        setTaxPercent(taxPercent);
      }
    } else {
      setTaxPercent(0);
    }

    setTip(parsedData.tip);

    // scanned values not stored; participants set next

    setCurrentStep('participants');
  };

  const handleImagesProcess = async (files: File[]) => {
    // Check access before OCR
    const accessResult = checkAccess('OCR', subscription);
    if (!accessResult.allowed) {
      console.log('OCR access denied:', accessResult.reason);
      onPricingRedirect();
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(10);
    try {
      const compressed = await Promise.all(files.map(f => compressImageFile(f, 1400, 0.7)));
      setProcessingProgress(25);
      const ocrResult = await processReceiptImages(compressed);
      setProcessingProgress(65);
      const parsedData = parseReceiptData(ocrResult.text);
      
      // Check if OCR successfully extracted any data
      const hasExtractedData = (parsedData.items.length > 0 || parsedData.total > 0);
      
      if (!hasExtractedData) {
        setToast({ message: 'No data detected in receipt. Please try another image or add items manually.', type: 'info', autoCloseMs: 3500 });
        // Don't count this scan - OCR failed to extract data
        return;
      }
      
      if (!parsedData.total || parsedData.total === 0) {
        setToast({ message: "We couldn't detect a total. You can fill it in manually.", type: 'info', autoCloseMs: 3500 });
      }
      if (parsedData.items.length === 0) {
        setToast({ message: 'No line items detected. Add items manually to continue.', type: 'info', autoCloseMs: 3500 });
      }
      applyParsedReceipt(parsedData);

      // Count the scan only after successful data extraction
      const allowed = await subscription.useScan();
      if (!allowed) {
        setToast({ message: 'Free scan limit reached. Upgrade to Pro for more scans.', type: 'info', autoCloseMs: 3500 });
      }
    } catch (error) {
      console.error('Error processing images:', error);
      setToast({ message: 'Failed to process receipts. Please try again or add items manually.', type: 'error', dismissible: false });
      // Don't count this scan - OCR processing failed
    } finally {
      setIsProcessing(false);
      setProcessingProgress(100);
    }
  };


  const handleCustomTotalChange = (participantId: string, value: number) => {
    setCustomTotals(prev => ({ ...prev, [participantId]: value }));
  };

  const handleTaxChange = (value: number) => {
    setTaxPercent(Math.round(value * 100) / 100);
  };

  const handleTipChange = (value: number) => {
    setTip(Math.round(value * 100) / 100);
  };

  const handleReset = () => {
    setParticipants([]);
    setItems([]);
    setTaxPercent(0);
    setTip(0);
    setCustomTotals({});
    setCurrentStep('scan');
  };

  const handleClearHistory = async () => {
    try {
      await subscription.clearSplitHistory();
      setSplitHistory([]);
      setDetailedSplits([]);
      setSavedNames([]);
      alert('✅ History cleared successfully!');
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history. Please try again.');
    }
  };

  const handleFinishSplit = async () => {
    if (hasMismatch) {
      alert('Totals mismatch detected. Please adjust participant totals to match the receipt total.');
      return;
    }

    const date = new Date().toISOString();
    const records: SplitRecord[] = finalParticipantTotals.map(pt => ({
      name: pt.participantName,
      amount: Number(pt.grandTotal.toFixed(2)),
      date,
    }));

    // Create detailed split information
    const detailedSplit: DetailedSplit = {
      date,
      taxPercent,
      tip,
      people: finalParticipantTotals.map(pt => ({
        name: pt.participantName,
        items: pt.items.map(item => {
          const assignmentCount = Math.max(1, item.assignedTo.length);
          const qty = item.quantity ?? 1;
          const lineTotal = item.price * qty;
          const assignedShare = lineTotal / assignmentCount;
          
          return {
            description: item.description,
            price: item.price,
            quantity: qty,
            isShared: item.isShared,
            assignedShare: Number(assignedShare.toFixed(2)),
          };
        }),
        itemsTotal: Number(pt.itemsTotal.toFixed(2)),
        taxShare: Number(pt.taxShare.toFixed(2)),
        tipShare: Number(pt.tipShare.toFixed(2)),
        grandTotal: Number(pt.grandTotal.toFixed(2)),
      })),
    };

    try {
      await persistRecords(records, detailedSplit);
      alert('Split saved successfully!');
      handleReset();
    } catch (error) {
      alert('Failed to save split. Please try again.');
      console.error('Save error:', error);
    }
  };

  const participantTotals = calculateParticipantTotals(participants, items, taxPercent, tip);
  const itemsSubtotal = useMemo(() => {
    return Math.round(items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0) * 100) / 100;
  }, [items]);
  const taxAmount = useMemo(() => Math.round(itemsSubtotal * (taxPercent / 100) * 100) / 100, [itemsSubtotal, taxPercent]);
  const expectedTotal = useMemo(() => {
    return Math.round((itemsSubtotal + taxAmount + tip) * 100) / 100;
  }, [itemsSubtotal, taxAmount, tip]);

  const finalParticipantTotals = useMemo(
    () => participantTotals.map(pt => ({
      ...pt,
      grandTotal: customTotals[pt.participantId] ?? pt.grandTotal,
    })),
    [participantTotals, customTotals]
  );

  const finalSum = useMemo(
    () => Math.round(finalParticipantTotals.reduce((sum, pt) => sum + pt.grandTotal, 0) * 100) / 100,
    [finalParticipantTotals]
  );

  const mismatchAmount = finalSum - expectedTotal;
  const hasMismatch = Math.abs(mismatchAmount) > 0.01;
  const scansRemaining = subscription.maxScansPerMonth - subscription.scansUsedThisMonth;

  const hasUnassignedItems = useMemo(
    () => items.some(item => item.assignedTo.length === 0),
    [items]
  );

  // Progress animation for processing overlay
  useEffect(() => {
    if (!isProcessing) {
      const timeout = setTimeout(() => setProcessingProgress(0), 400);
      return () => clearTimeout(timeout);
    }
    let current = processingProgress || 10;
    const interval = setInterval(() => {
      current = Math.min(current + 5, 90);
      setProcessingProgress(current);
    }, 300);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  const closeToast = () => setToast(null);

  // Auto-close info messages when autoCloseMs is provided
  useEffect(() => {
    if (!toast || !toast.autoCloseMs) return;
    const t = setTimeout(() => setToast(null), toast.autoCloseMs);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>🧾 SplitBuddy</h1>
            <p>Smart bill splitting made easy</p>
          </div>
          <div className="header-actions">
            <ScanCounter />
            <button
              className="features-btn"
              onClick={() => setShowFeatures(true)}
              title="Compare Free vs Pro features"
            >
              ✨ Features
            </button>
            <UserMenu
              onNotify={(message, type) => setToast({ message, type, autoCloseMs: type === 'info' ? 2500 : undefined })}
              splitHistory={splitHistory}
              detailedSplits={detailedSplits}
              onClearHistory={handleClearHistory}
              onShowFeatures={() => setShowFeatures(true)}
            />
          </div>
        </div>
      </header>

      <div className="step-indicator">
        <div className={`step ${currentStep === 'scan' ? 'active' : ''}`}>1. Scan</div>
        <div className={`step ${currentStep === 'participants' ? 'active' : ''}`}>2. Participants</div>
        <div className={`step ${currentStep === 'assign' ? 'active' : ''}`}>3. Assign</div>
        <div className={`step ${currentStep === 'results' ? 'active' : ''}`}>4. Results</div>
      </div>

      <main className="app-content">
        {isProcessing && (
          <div className="processing-overlay modern">
            <div className="progress-shell">
              <div className="progress-bar" style={{ width: `${processingProgress}%` }} />
            </div>
            <p>Scanning receipt... {Math.min(Math.round(processingProgress), 100)}%</p>
            <div className="skeleton-blocks">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
            </div>
          </div>
        )}

        {currentStep === 'scan' && (
          <div className="step-content">
            <CameraCapture 
              isDisabled={!subscription.isPro && scansRemaining === 0}
              disableReason="🔒 Upgrade to Pro to scan more receipts"
              onDisabledClick={() => setShowFeatures(true)}
              onFilesProcess={handleImagesProcess}
              onError={msg => setToast({ message: msg, type: 'error', dismissible: false })}
            />
            <div className="scan-secondary-actions">
              <button 
                onClick={() => setCurrentStep('participants')}
                className="btn btn-secondary"
              >
                Skip & Add Items Manually →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'participants' && (
          <div className="step-content">
            <ParticipantManager 
              participants={participants}
              onParticipantsChange={setParticipants}
              savedNames={savedNames}
            />
            <div className="step-navigation">
              <button 
                onClick={() => setCurrentStep('assign')} 
                className="btn btn-primary"
                disabled={participants.length === 0}
              >
                Next: Assign Items →
              </button>
              <button onClick={() => setCurrentStep('scan')} className="btn btn-secondary">
                ← Back
              </button>
            </div>
          </div>
        )}

        {currentStep === 'assign' && (
          <div className="step-content">
            <ItemAssignment 
              items={items}
              participants={participants}
              onItemsChange={handleItemsChange}
            />
            <div className="step-navigation">
              <button 
                onClick={() => setCurrentStep('results')} 
                className="btn btn-primary"
                disabled={items.length === 0 || hasUnassignedItems}
                title={hasUnassignedItems ? 'Please assign all items to participants' : ''}
              >
                Calculate Split →
              </button>
              <button onClick={() => setCurrentStep('participants')} className="btn btn-secondary">
                ← Back
              </button>
            </div>
          </div>
        )}

        {currentStep === 'results' && (
          <div className="step-content">
            <Results 
              participantTotals={finalParticipantTotals}
              taxPercent={taxPercent}
              tip={tip}
              onTaxChange={handleTaxChange}
              onTipChange={handleTipChange}
              expectedTotal={expectedTotal}
              itemsSubtotal={itemsSubtotal}
              customTotals={customTotals}
              onCustomTotalChange={handleCustomTotalChange}
              hasMismatch={hasMismatch}
              mismatchAmount={mismatchAmount}
              onFinish={handleFinishSplit}
            />
            <div className="step-navigation">
              <button 
                onClick={handleReset}
                className="btn btn-primary"
              >
                🔄 Start New Split
              </button>
              <button onClick={() => setCurrentStep('assign')} className="btn btn-secondary">
                ← Back to Items
              </button>
            </div>
          </div>
        )}
      </main>

      <AdWrapper position="bottom" />

      <footer className="app-footer">
        <p>Made with 💚 by IgN3eL</p>
      </footer>

      {showFeatures && (
        <FeaturesComparison onClose={() => setShowFeatures(false)} />
      )}

      {toast && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className={`modal ${toast.type}`}>
            <div className="modal-header">
              <h3>{toast.type === 'error' ? 'Error' : 'Notice'}</h3>
              {toast.dismissible !== false && (
                <button className="modal-close" onClick={closeToast} aria-label="Close">×</button>
              )}
            </div>
            <div className="modal-body">
              <p>{toast.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeToast}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      fallback={(
        <div style={{ padding: '1.5rem' }}>
          <h2>SplitBuddy encountered an error.</h2>
          <p>Please reload the page. If this persists, check your environment configuration.</p>
        </div>
      )}
    >
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </ErrorBoundary>
  );
}

export default App;

