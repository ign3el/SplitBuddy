import { useState } from 'react';
import type { Participant } from '../types';
import { generateId, generateRandomColor } from '../utils/calculations';
import './ParticipantManager.css';

interface ParticipantManagerProps {
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  savedNames?: string[];
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onParticipantsChange,
  savedNames = [],
}) => {
  const [newName, setNewName] = useState('');

  const addParticipant = (name?: string) => {
    const targetName = (name ?? newName).trim();
    if (targetName) {
      const alreadyExists = participants.some(p => p.name.toLowerCase() === targetName.toLowerCase());
      if (alreadyExists) {
        setNewName('');
        return;
      }

      const newParticipant: Participant = {
        id: generateId(),
        name: targetName,
        color: generateRandomColor(),
      };
      onParticipantsChange([...participants, newParticipant]);
      setNewName('');
    }
  };

  const removeParticipant = (id: string) => {
    onParticipantsChange(participants.filter(p => p.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addParticipant();
    }
  };

  return (
    <div className="participant-manager">
      <h2>👥 Add Participants</h2>
      
      <div className="add-participant">
        <input
          type="text"
          placeholder="Enter name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={() => addParticipant()} className="btn btn-primary">
          ➕ Add
        </button>
      </div>

      {savedNames.length > 0 && (
        <div className="saved-names">
          <p className="saved-label">Saved names</p>
          <div className="saved-chips">
            {savedNames.map(name => (
              <button
                key={name}
                className="saved-chip"
                onClick={() => addParticipant(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="participants-list">
        {participants.length === 0 ? (
          <p className="empty-state">No participants added yet</p>
        ) : (
          participants.map(participant => (
            <div 
              key={participant.id} 
              className="participant-chip"
              style={{ borderColor: participant.color }}
            >
              <span className="participant-name">{participant.name}</span>
              <button 
                onClick={() => removeParticipant(participant.id)}
                className="remove-btn"
                aria-label="Remove participant"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
