import type { Participant, ReceiptItem, ParticipantTotal } from '../types';

const roundToTwo = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const calculateParticipantTotals = (
  participants: Participant[],
  items: ReceiptItem[],
  taxPercent: number,
  tipAmount: number
): ParticipantTotal[] => {
  const itemsSubtotal = roundToTwo(items.reduce((sum, item) => sum + item.price, 0));
  const totalTaxAmount = roundToTwo(itemsSubtotal * (taxPercent / 100));

  return participants.map(participant => {
    const participantItems = items.filter(item => item.assignedTo.includes(participant.id));

    const itemsTotal = roundToTwo(participantItems.reduce((sum, item) => {
      if (item.isShared && item.assignedTo.length > 0) {
        return sum + item.price / item.assignedTo.length;
      }
      return sum + item.price;
    }, 0));

    const proportion = itemsSubtotal > 0 ? itemsTotal / itemsSubtotal : 0;
    const taxShare = roundToTwo(totalTaxAmount * proportion);
    const tipShare = roundToTwo(tipAmount * proportion);
    const grandTotal = roundToTwo(itemsTotal + taxShare + tipShare);

    return {
      participantId: participant.id,
      participantName: participant.name,
      items: participantItems,
      itemsTotal,
      taxShare,
      tipShare,
      grandTotal,
    };
  });
};

export const generateRandomColor = (): string => {
  const colors = [
    '#10b981', '#059669', '#34d399', '#6ee7b7', // greens
    '#14b8a6', '#0d9488', '#2dd4bf', // teals
    '#22c55e', '#16a34a', // more greens
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
