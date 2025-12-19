import { useEffect, useMemo, useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { ParticipantManager } from './components/ParticipantManager';
import { ItemAssignment } from './components/ItemAssignment';
import { Results } from './components/Results';
import { SplitHistory } from './components/SplitHistory';
import type { Participant, ReceiptItem, SplitRecord, DetailedSplit } from './types';
import { processReceiptImages, parseReceiptText } from './utils/ocrProcessor';
import { calculateParticipantTotals, generateId } from './utils/calculations';
import './App.css';


const STORAGE_KEY = 'splitbuddy_history';
const DETAILED_SPLITS_KEY = 'splitbuddy_detailed_splits';

function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [tip, setTip] = useState(0);
  // Removed unused scanned subtotal/total state
  const [customTotals, setCustomTotals] = useState<Record<string, number>>({});
  const [savedNames, setSavedNames] = useState<string[]>([]);
  const [splitHistory, setSplitHistory] = useState<SplitRecord[]>([]);
  const [detailedSplits, setDetailedSplits] = useState<DetailedSplit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'scan' | 'participants' | 'assign' | 'results'>('scan');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const records: SplitRecord[] = JSON.parse(saved);
        setSplitHistory(records);
        const uniqueNames = Array.from(new Set(records.map(r => r.name)));
        setSavedNames(uniqueNames);
      }
      const detailedSaved = localStorage.getItem(DETAILED_SPLITS_KEY);
      if (detailedSaved) {
        const detailed: DetailedSplit[] = JSON.parse(detailedSaved);
        setDetailedSplits(detailed);
      }
    } catch (error) {
      console.error('Error loading saved names', error);
    }
  }, []);

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

  const persistRecords = (newRecords: SplitRecord[], detailedSplit: DetailedSplit) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existing: SplitRecord[] = saved ? JSON.parse(saved) : [];
      const merged = [...existing, ...newRecords];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      setSplitHistory(merged);
      const uniqueNames = Array.from(new Set(merged.map(r => r.name)));
      setSavedNames(uniqueNames);

      // Persist detailed split information
      const detailedSaved = localStorage.getItem(DETAILED_SPLITS_KEY);
      const existingDetailed: DetailedSplit[] = detailedSaved ? JSON.parse(detailedSaved) : [];
      const mergedDetailed = [...existingDetailed, detailedSplit];
      localStorage.setItem(DETAILED_SPLITS_KEY, JSON.stringify(mergedDetailed));
      setDetailedSplits(mergedDetailed);
    } catch (error) {
      console.error('Error saving records', error);
    }
  };

  const applyParsedReceipt = (parsedData: ReturnType<typeof parseReceiptText>) => {
    const newItems: ReceiptItem[] = parsedData.items.map(item => ({
      id: generateId(),
      description: item.description,
      price: item.price,
      assignedTo: [],
      isShared: false,
    }));

    setItems(newItems);
    setCustomTotals({});

    // Default to zero unless the receipt provided explicit values
    setTaxPercent(0);
    setTip(0);

    // scanned values not stored; participants set next

    setCurrentStep('participants');
  };

  const handleImagesProcess = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const ocrResult = await processReceiptImages(files);
      const parsedData = parseReceiptText(ocrResult.text);
      applyParsedReceipt(parsedData);
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Failed to process receipts. Please try again or add items manually.');
    } finally {
      setIsProcessing(false);
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

  const handleFinishSplit = () => {
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
          // Calculate this person's share of the item
          const assignmentCount = item.assignedTo.length;
          const assignedShare = item.price / assignmentCount;
          
          return {
            description: item.description,
            price: item.price,
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

    persistRecords(records, detailedSplit);
    alert('Split saved for reference.');
    handleReset();
  };

  const participantTotals = calculateParticipantTotals(participants, items, taxPercent, tip);
  const itemsSubtotal = useMemo(() => Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100, [items]);
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>🧾 SplitBuddy</h1>
            <p>Smart bill splitting made easy</p>
          </div>
          {splitHistory.length > 0 && (
            <button 
              className="history-btn"
              onClick={() => setShowHistory(true)}
              title="View split history"
            >
              📊 History ({splitHistory.length})
            </button>
          )}
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
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>Processing receipt...</p>
          </div>
        )}

        {currentStep === 'scan' && (
          <div className="step-content">
            <CameraCapture 
              onFilesProcess={handleImagesProcess}
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
              <button onClick={() => setCurrentStep('scan')} className="btn btn-secondary">
                ← Back
              </button>
              <button 
                onClick={() => setCurrentStep('assign')} 
                className="btn btn-primary"
                disabled={participants.length === 0}
              >
                Next: Assign Items →
              </button>
            </div>
          </div>
        )}

        {currentStep === 'assign' && (
          <div className="step-content">
            <ItemAssignment 
              items={items}
              participants={participants}
              onItemsChange={setItems}
            />
            <div className="step-navigation">
              <button onClick={() => setCurrentStep('participants')} className="btn btn-secondary">
                ← Back
              </button>
              <button 
                onClick={() => setCurrentStep('results')} 
                className="btn btn-primary"
                disabled={items.length === 0}
              >
                Calculate Split →
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
              <button onClick={() => setCurrentStep('assign')} className="btn btn-secondary">
                ← Back to Items
              </button>
              <button 
                onClick={handleReset}
                className="btn btn-primary"
              >
                🔄 Start New Split
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Made with 💚 by IgN3eL</p>
      </footer>

      {showHistory && (
        <SplitHistory
          records={splitHistory}
          detailedSplits={detailedSplits}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

export default App;
