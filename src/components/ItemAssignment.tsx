import { useMemo, useState } from 'react';
import type { ReceiptItem, Participant } from '../types';
import { generateId } from '../utils/calculations';
import './ItemAssignment.css';

interface ItemAssignmentProps {
  items: ReceiptItem[];
  participants: Participant[];
  onItemsChange: (items: ReceiptItem[]) => void;
}

export const ItemAssignment: React.FC<ItemAssignmentProps> = ({
  items,
  participants,
  onItemsChange,
}) => {
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items]
  );

  const addItem = () => {
    const price = parseFloat(newItemPrice);
    if (newItemDescription.trim() && !isNaN(price) && price > 0) {
      const newItem: ReceiptItem = {
        id: generateId(),
        description: newItemDescription.trim(),
        price: Math.round(price * 100) / 100,
        assignedTo: [],
        isShared: false,
      };
      onItemsChange([...items, newItem]);
      setNewItemDescription('');
      setNewItemPrice('');
    }
  };

  const removeItem = (itemId: string) => {
    onItemsChange(items.filter(item => item.id !== itemId));
  };

  const toggleParticipantAssignment = (itemId: string, participantId: string) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const isAssigned = item.assignedTo.includes(participantId);
        const newAssignedTo = isAssigned
          ? item.assignedTo.filter(id => id !== participantId)
          : [...item.assignedTo, participantId];
        
        return {
          ...item,
          assignedTo: newAssignedTo,
          isShared: newAssignedTo.length > 1,
        };
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  const updateItemPrice = (itemId: string, newPrice: string) => {
    const price = parseFloat(newPrice);
    if (!isNaN(price) && price >= 0) {
      onItemsChange(items.map(item => 
        item.id === itemId ? { ...item, price: Math.round(price * 100) / 100 } : item
      ));
    }
  };

  const updateItemDescription = (itemId: string, newDescription: string) => {
    onItemsChange(items.map(item => 
      item.id === itemId ? { ...item, description: newDescription } : item
    ));
  };

  return (
    <div className="item-assignment">
      <h2>🧾 Assign Items</h2>

      <div className="add-item">
        <input
          type="text"
          placeholder="Item description..."
          value={newItemDescription}
          onChange={(e) => setNewItemDescription(e.target.value)}
        />
        <input
          type="number"
          placeholder="Price (AED)"
          step="0.01"
          min="0"
          value={newItemPrice}
          onChange={(e) => setNewItemPrice(e.target.value)}
        />
        <button onClick={addItem} className="btn btn-primary">
          ➕ Add Item
        </button>
      </div>

      <div className="items-summary">
        <span>Items total (including manual)</span>
        <strong>AED {itemsTotal.toFixed(2)}</strong>
      </div>

      {items.length === 0 ? (
        <p className="empty-state">No items added yet</p>
      ) : (
        <div className="items-list">
          {items.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-header">
                <input
                  type="text"
                  className="item-description-input"
                  value={item.description}
                  onChange={(e) => updateItemDescription(item.id, e.target.value)}
                />
                <input
                  type="number"
                  className="item-price-input"
                  step="0.01"
                  min="0"
                  value={item.price}
                  onChange={(e) => updateItemPrice(item.id, e.target.value)}
                />
                <button 
                  onClick={() => removeItem(item.id)}
                  className="remove-btn"
                  aria-label="Remove item"
                >
                  🗑️
                </button>
              </div>

              <div className="item-participants">
                <span className="assign-label">Assign to:</span>
                <div className="participant-buttons">
                  {participants.map(participant => {
                    const isAssigned = item.assignedTo.includes(participant.id);
                    return (
                      <button
                        key={participant.id}
                        onClick={() => toggleParticipantAssignment(item.id, participant.id)}
                        className={`participant-btn ${isAssigned ? 'assigned' : ''}`}
                        style={{
                          borderColor: isAssigned ? participant.color : '#e5e7eb',
                          backgroundColor: isAssigned ? participant.color + '20' : 'white',
                        }}
                      >
                        {participant.name}
                      </button>
                    );
                  })}
                </div>
                {item.isShared && (
                  <span className="shared-badge">🔀 Shared</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
