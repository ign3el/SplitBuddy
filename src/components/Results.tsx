import { useEffect, useMemo, useState } from 'react';
import type { ParticipantTotal } from '../types';
import './Results.css';

interface ResultsProps {
  participantTotals: ParticipantTotal[];
  customTotals: Record<string, number>;
  onCustomTotalChange: (participantId: string, value: number) => void;
  taxPercent: number;
  tip: number;
  onTaxChange: (taxPercent: number) => void;
  onTipChange: (tip: number) => void;
  expectedTotal: number;
  itemsSubtotal: number;
  hasMismatch: boolean;
  mismatchAmount: number;
  onFinish: () => void;
}

const formatCurrency = (value: number) => `AED ${value.toFixed(2)}`;

export const Results: React.FC<ResultsProps> = ({
  participantTotals,
  customTotals,
  onCustomTotalChange,
  taxPercent,
  tip,
  onTaxChange,
  onTipChange,
  expectedTotal,
  itemsSubtotal,
  hasMismatch,
  mismatchAmount,
  onFinish,
}) => {
  const [taxInput, setTaxInput] = useState(taxPercent.toString());
  const [tipInput, setTipInput] = useState(tip.toString());

  useEffect(() => setTaxInput(taxPercent.toString()), [taxPercent]);
  useEffect(() => setTipInput(tip.toString()), [tip]);

  const taxAmount = useMemo(() => Math.round(itemsSubtotal * (taxPercent / 100) * 100) / 100, [itemsSubtotal, taxPercent]);

  const totalWithOverrides = useMemo(
    () => Math.round(participantTotals.reduce((sum, pt) => sum + pt.grandTotal, 0) * 100) / 100,
    [participantTotals]
  );

  const handleTaxChange = (value: string) => {
    setTaxInput(value);
  };

  const handleTipChange = (value: string) => {
    setTipInput(value);
  };

  const applyCharges = () => {
    const parsedTax = parseFloat(taxInput);
    const parsedTip = parseFloat(tipInput);
    onTaxChange(!isNaN(parsedTax) && parsedTax >= 0 ? parsedTax : 0);
    onTipChange(!isNaN(parsedTip) && parsedTip >= 0 ? parsedTip : 0);
  };

  return (
    <div className="results">
      <h2>💰 Split Results</h2>

      <div className="additional-charges">
        <div className="charge-input">
          <label>Tax (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={taxInput}
            placeholder="0"
            onChange={(e) => handleTaxChange(e.target.value)}
            onBlur={applyCharges}
          />
          <span className="charge-hint">Adds {formatCurrency(taxAmount)}</span>
        </div>
        <div className="charge-input">
          <label>Tip (AED)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={tipInput}
            placeholder="0"
            onChange={(e) => handleTipChange(e.target.value)}
            onBlur={applyCharges}
          />
        </div>
        <div className="charge-actions">
          <button className="btn btn-secondary" type="button" onClick={applyCharges}>
            💾 Save charges
          </button>
        </div>
      </div>

      {participantTotals.length === 0 ? (
        <p className="empty-state">Add participants and assign items to see results</p>
      ) : (
        <div className="totals-list">
          {participantTotals.map(pt => {
            const overrideValue = customTotals[pt.participantId];
            const displayedTotal = overrideValue !== undefined ? overrideValue : pt.grandTotal;

            return (
              <div key={pt.participantId} className="total-card">
                <h3>{pt.participantName}</h3>
                
                {/* Items breakdown */}
                <div className="items-breakdown">
                  <p className="section-label">Items:</p>
                  {pt.items.length === 0 ? (
                    <p className="no-items">No items assigned</p>
                  ) : (
                    <div className="items-list">
                      {pt.items.map((item, idx) => {
                        // Calculate this person's share of the item
                        const assignmentCount = item.assignedTo.length;
                        const sharePerPerson = item.price / assignmentCount;
                        
                        return (
                          <div key={idx} className="item-row">
                            <div className="item-info">
                              <span className="item-description">{item.description}</span>
                              {item.isShared && <span className="shared-badge">shared</span>}
                            </div>
                            <div className="item-prices">
                              <span className="item-total">AED {item.price.toFixed(2)}</span>
                              <span className="item-divider">/</span>
                              <span className="item-share">AED {sharePerPerson.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="total-breakdown">
                  <div className="breakdown-row">
                    <span>Items ({pt.items.length})</span>
                    <span>{formatCurrency(pt.itemsTotal)}</span>
                  </div>
                  <div className="breakdown-row minor">
                    <span>Tax share</span>
                    <span>{formatCurrency(pt.taxShare)}</span>
                  </div>
                  <div className="breakdown-row minor">
                    <span>Tip share</span>
                    <span>{formatCurrency(pt.tipShare)}</span>
                  </div>
                  <div className="edit-total">
                    <label htmlFor={`total-${pt.participantId}`}>Final amount (AED)</label>
                    <input
                      id={`total-${pt.participantId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={displayedTotal}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') return;
                        const parsed = parseFloat(value);
                        if (!isNaN(parsed) && parsed >= 0) {
                          onCustomTotalChange(pt.participantId, Math.round(parsed * 100) / 100);
                        }
                      }}
                    />
                  </div>
                  <div className="breakdown-row total">
                    <span>Total</span>
                    <span>{formatCurrency(displayedTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className={`grand-total ${hasMismatch ? 'error' : ''}`}>
            <span>Grand Total</span>
            <div className="grand-total-values">
              <span>{formatCurrency(totalWithOverrides)}</span>
              <span className="expected">Expected: {formatCurrency(expectedTotal)}</span>
            </div>
          </div>

          {hasMismatch && (
            <div className="mismatch-error">
              ⚠️ Totals differ by {formatCurrency(Math.abs(mismatchAmount))}. Adjust participant amounts to match the receipt.
            </div>
          )}

          <div className="finish-row">
            <button className="btn btn-primary" onClick={onFinish} disabled={hasMismatch}>
              ✅ Finish & Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
