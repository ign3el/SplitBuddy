import type { SplitRecord } from '../types';

export interface DateTableRow {
  date: string;
  [key: string]: string | number; // person names as keys, amounts as values
}

export const buildDateTableData = (records: SplitRecord[]): { rows: DateTableRow[]; people: string[] } => {
  const grouped: Record<string, Record<string, number>> = {};
  const peopleSet = new Set<string>();

  // Group by date, then by person
  records.forEach(record => {
    const dateKey = new Date(record.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    peopleSet.add(record.name);

    if (!grouped[dateKey]) {
      grouped[dateKey] = {};
    }

    if (!grouped[dateKey][record.name]) {
      grouped[dateKey][record.name] = 0;
    }
    grouped[dateKey][record.name] += record.amount;
  });

  // Convert to table rows sorted by date descending
  const sortedDates = Object.keys(grouped).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const tableRows: DateTableRow[] = sortedDates.map(date => ({
    date,
    ...grouped[date],
  }));

  // Sort people alphabetically
  const people = Array.from(peopleSet).sort((a, b) => a.localeCompare(b));

  return { rows: tableRows, people };
};

export const getUniquePeople = (records: SplitRecord[]): string[] => {
  const people = new Set(records.map(r => r.name));
  return Array.from(people).sort((a, b) => a.localeCompare(b));
};

export const exportAsCSV = (records: SplitRecord[]): string => {
  const { rows, people } = buildDateTableData(records);

  // Build CSV header
  const headers = ['Date', ...people];
  const csvLines: string[] = [headers.map(h => `"${h}"`).join(',')];

  // Build CSV rows
  rows.forEach(row => {
    const values = [
      `"${row.date}"`,
      ...people.map(person => {
        const amount = row[person];
        return amount !== undefined ? (typeof amount === 'number' ? amount.toFixed(2) : parseFloat(String(amount)).toFixed(2)) : '0.00';
      }),
    ];
    csvLines.push(values.join(','));
  });

  // Add total row
  const totals = ['TOTAL', ...people.map(person => {
    const total = rows.reduce((sum, row) => {
      const amount = row[person];
      return sum + (amount !== undefined ? (typeof amount === 'number' ? amount : parseFloat(String(amount))) : 0);
    }, 0);
    return total.toFixed(2);
  })];
  csvLines.push(totals.map((v, i) => i === 0 ? `"${v}"` : v).join(','));

  return csvLines.join('\n');
};

export const downloadCSV = (csvContent: string, filename = 'split-history.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
