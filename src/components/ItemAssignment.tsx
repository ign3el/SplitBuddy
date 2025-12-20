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
  const [newItemQuantity, setNewItemQuantity] = useState('1');

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0),
    [items]
  );

  const unassignedItems = useMemo(
    () => items.filter(item => item.assignedTo.length === 0),
    [items]
  );

  const addItem = () => {
    const price = parseFloat(newItemPrice);
    const quantity = parseInt(newItemQuantity, 10);
    const safeQuantity = !isNaN(quantity) && quantity > 0 ? quantity : 1;

    if (newItemDescription.trim() && !isNaN(price) && price > 0) {
      const newItem: ReceiptItem = {
        id: generateId(),
        description: newItemDescription.trim(),
        price: Math.round(price * 100) / 100,
        quantity: safeQuantity,
        assignedTo: [],
        isShared: false,
      };
      onItemsChange([...items, newItem]);
      setNewItemDescription('');
      setNewItemPrice('');
      setNewItemQuantity('1');
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

  const updateItemQuantity = (itemId: string, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (!isNaN(quantity) && quantity > 0) {
      onItemsChange(items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
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
          className="qty-input"
          placeholder="Qty"
          step="1"
          min="1"
          value={newItemQuantity}
          onChange={(e) => setNewItemQuantity(e.target.value)}
        />
        <input
          type="number"
          placeholder="Unit price (AED)"
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
        <span>Items total (qty included)</span>
        <strong>AED {itemsTotal.toFixed(2)}</strong>
      </div>

      {unassignedItems.length > 0 && (
        <div className="unassigned-warning">
          ⚠️ {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} not assigned. Please assign all items to participants before proceeding.
        </div>
      )}

      {items.length === 0 ? (
        <p className="empty-state">No items added yet</p>
      ) : (
        <div className="items-list">
          {items.map(item => {
            const quantity = item.quantity ?? 1;
            const lineTotal = item.price * quantity;

            return (
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
                    className="item-qty-input"
                    step="1"
                    min="1"
                    value={quantity}
                    onChange={(e) => updateItemQuantity(item.id, e.target.value)}
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

                <div className="item-line-total">
                  Line total: AED {lineTotal.toFixed(2)}{' '}
                  {quantity > 1 && <span className="line-qty-note">(x{quantity})</span>}
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
            );
          })}
        </div>
      )}
    </div>
  );
};
