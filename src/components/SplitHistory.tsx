import { useState } from 'react';
import type { SplitRecord, DetailedSplit } from '../types';
import { buildDateTableData, exportAsCSV, downloadCSV } from '../utils/historyExport';
import './SplitHistory.css';

interface SplitHistoryProps {
  records: SplitRecord[];
  detailedSplits: DetailedSplit[];
  onClose: () => void;
}

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const groupByDate = (records: SplitRecord[]): Record<string, SplitRecord[]> => {
  const grouped: Record<string, SplitRecord[]> = {};
  
  records.forEach(record => {
    const date = formatDateOnly(record.date);
    
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(record);
  });
  
  return grouped;
};

export const SplitHistory: React.FC<SplitHistoryProps> = ({ records, detailedSplits, onClose }) => {
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'detailed'>('list');
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number | null>(null);

  console.log('SplitHistory mounted:', {
    recordsCount: records.length,
    detailedSplitsCount: detailedSplits.length,
    records: records,
    detailedSplits: detailedSplits
  });

  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const sortedDetailedSplits = [...detailedSplits].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  const grouped = groupByDate(sortedRecords);
  const groupedDates = Object.keys(grouped).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  const tableRows = buildDateTableData(records);
  const people = tableRows.people;

  const handleExportCSV = () => {
    const csv = exportAsCSV(records);
    downloadCSV(csv, `split-history-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleClearHistory = () => {
    const firstConfirm = confirm('⚠️ WARNING: This will permanently delete ALL split history data. Are you absolutely sure?');
    if (!firstConfirm) return;
    
    const secondConfirm = confirm('This is your last chance! Type confirmation is recommended.\n\nClick OK to permanently delete all history, or Cancel to keep your data.');
    if (secondConfirm) {
      localStorage.removeItem('splitbuddy_history');
      localStorage.removeItem('splitbuddy_detailed_splits');
      alert('✅ History cleared successfully! The page will refresh.');
      window.location.reload();
    }
  };

  const selectedSplit = selectedSplitIndex !== null ? sortedDetailedSplits[selectedSplitIndex] : null;

  console.log('SplitHistory Debug:', {
    selectedSplitIndex,
    detailedSplitsLength: detailedSplits.length,
    sortedDetailedSplitsLength: sortedDetailedSplits.length,
    selectedSplit: selectedSplit,
    hasPeople: selectedSplit?.people?.length
  });

  return (
    <div className="split-history-overlay">
      <div className="split-history-modal">
        <div className="history-header">
          <h2>📊 Split History</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close history">
            ✕
          </button>
        </div>

        {records.length === 0 ? (
          <div className="empty-history">
            <p>No splits recorded yet</p>
          </div>
        ) : (
          <>
            <div className="history-summary">
              <span>{records.length} splits</span>
              <span>Total: AED {totalAmount.toFixed(2)}</span>
            </div>

            {selectedSplitIndex !== null ? (
              selectedSplit ? (
                <div className="detailed-split-container">
                  <div className="detailed-split-header">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setSelectedSplitIndex(null)}
                    >
                      ← Back
                    </button>
                  </div>
                  <div className="detailed-split-view">
                    <h3>{formatDate(selectedSplit.date)}</h3>
                    <div className="split-params">
                      <span>Tax: {selectedSplit.taxPercent}%</span>
                      <span>Tip: AED {selectedSplit.tip.toFixed(2)}</span>
                    </div>
                    
                    <div className="split-details-grid">
                      {selectedSplit.people && selectedSplit.people.length > 0 ? (
                        selectedSplit.people.map((person, idx) => (
                          <div key={idx} className="person-detail-card">
                            <h4>{person.name}</h4>
                            <div className="items-list">
                              <p className="section-label">Items:</p>
                              {person.items && person.items.length === 0 ? (
                                <p className="no-items">No items</p>
                              ) : person.items ? (
                                <ul>
                                  {person.items.map((item, itemIdx) => (
                                    <li key={itemIdx} className="split-item">
                                      <div className="split-item-content">
                                        <span className="item-desc">
                                          {item.description}
                                          {item.isShared && <span className="shared-badge">shared</span>}
                                        </span>
                                      </div>
                                      <div className="split-item-prices">
                                        <span className="split-item-total">AED {item.price.toFixed(2)}</span>
                                        <span className="split-item-divider">/</span>
                                        <span className="split-item-share">AED {item.assignedShare.toFixed(2)}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="no-items">No items</p>
                              )}
                            </div>
                            
                            <div className="person-breakdown">
                              <div className="breakdown-line">
                                <span>Items Total:</span>
                                <span>AED {person.itemsTotal.toFixed(2)}</span>
                              </div>
                              <div className="breakdown-line">
                                <span>Tax Share:</span>
                                <span>AED {person.taxShare.toFixed(2)}</span>
                              </div>
                              <div className="breakdown-line">
                                <span>Tip Share:</span>
                                <span>AED {person.tipShare.toFixed(2)}</span>
                              </div>
                              <div className="breakdown-line total">
                                <span>Total:</span>
                                <span>AED {person.grandTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-details">
                          <p>No participant data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detailed-split-container">
                  <div className="detailed-split-header">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setSelectedSplitIndex(null)}
                    >
                      ← Back
                    </button>
                  </div>
                  <div className="empty-details">
                    <p>⚠️ Split details not available</p>
                    <p className="hint">This split was created before detailed item tracking was enabled. Only new splits will have detailed breakdowns.</p>
                  </div>
                </div>
              )
            ) : (
              <>
                <div className="view-toggle">
                  <button 
                    className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    📋 List
                  </button>
                  <button 
                    className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    📊 Table
                  </button>
                  <button 
                    className={`toggle-btn ${viewMode === 'detailed' ? 'active' : ''}`}
                    onClick={() => setViewMode('detailed')}
                  >
                    🔍 Details
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleExportCSV}
                    style={{ marginLeft: 'auto' }}
                  >
                    💾 Export CSV
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleClearHistory}
                    style={{ marginLeft: '0.5rem', background: '#ef4444', color: 'white', border: 'none' }}
                  >
                    🗑️ Clear All
                  </button>
                </div>

                {viewMode === 'list' ? (
                  <div className="history-list">
                    {groupedDates.map(dateGroup => (
                      <div key={dateGroup} className="history-date-group">
                        <h3 className="date-group-header">{dateGroup}</h3>
                        <div className="records-in-group">
                          {grouped[dateGroup].map((record, idx) => (
                            <div key={`${dateGroup}-${idx}`} className="history-record">
                              <div className="record-info">
                                <span className="record-name">{record.name}</span>
                                <span className="record-time">
                                  {new Date(record.date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <span className="record-amount">AED {record.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : viewMode === 'table' ? (
                  <div className="history-table-container">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th className="date-header">Date</th>
                          {people.map(person => (
                            <th key={person} className="person-header">{person}</th>
                          ))}
                          <th className="total-header">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.rows.map((row, idx) => {
                          const rowTotal = people.reduce((sum, person) => sum + (row[person] as number || 0), 0);
                          return (
                            <tr key={idx}>
                              <td className="date-cell">{row.date}</td>
                              {people.map(person => (
                                <td key={`${row.date}-${person}`} className="amount-cell">
                                  {row[person] ? `AED ${(row[person] as number).toFixed(2)}` : '-'}
                                </td>
                              ))}
                              <td className="row-total-cell">AED {rowTotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        <tr className="total-row">
                          <td className="date-cell"><strong>TOTAL</strong></td>
                          {people.map(person => {
                            const personTotal = tableRows.rows.reduce((sum, row) => sum + (row[person] as number || 0), 0);
                            return (
                              <td key={`total-${person}`} className="amount-cell">
                                <strong>AED {personTotal.toFixed(2)}</strong>
                              </td>
                            );
                          })}
                          <td className="row-total-cell">
                            <strong>AED {totalAmount.toFixed(2)}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="detailed-splits-list">
                    {sortedDetailedSplits.length === 0 ? (
                      <div className="empty-details">
                        <p>No detailed split information available.</p>
                        <p className="hint">Detailed breakdowns are only saved for new splits. Complete a new split to see detailed item information here.</p>
                      </div>
                    ) : (
                      sortedDetailedSplits.map((split, idx) => (
                        <div key={idx} className="detailed-split-summary">
                          <div className="split-summary-header">
                            <span className="split-date">{formatDate(split.date)}</span>
                            <button 
                              className="btn btn-primary"
                              onClick={() => setSelectedSplitIndex(idx)}
                            >
                              View Details →
                            </button>
                          </div>
                          <div className="split-people-tags">
                            {split.people.map((person, pIdx) => (
                              <div key={pIdx} className="person-tag">
                                <span className="person-name">{person.name}</span>
                                <span className="person-amount">AED {person.grandTotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
