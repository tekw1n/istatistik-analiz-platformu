import { useEffect, useMemo, useState } from 'react';
import { Messages } from '../../../components/ui/Messages';
import { formatNumber } from '../../../utils/format';
import { parseCell } from '../numbers';
import { pasteClassRows, readClassTable, type ClassRow } from '../tables';
import type { Dataset } from '../types';
import { EditableTable } from './EditableTable';

const EMPTY: ClassRow = { lower: '', upper: '', f: '' };

interface Props {
  initial?: { rows: ClassRow[]; openFirst: boolean; openLast: boolean };
  onDataset(dataset: Dataset | null): void;
}

export function GroupedForm({ initial, onDataset }: Props) {
  const [rows, setRows] = useState(initial?.rows ?? [EMPTY, EMPTY, EMPTY]);
  const [openFirst, setOpenFirst] = useState(initial?.openFirst ?? false);
  const [openLast, setOpenLast] = useState(initial?.openLast ?? false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const result = useMemo(
    () => readClassTable(rows, openFirst, openLast),
    [rows, openFirst, openLast],
  );

  useEffect(() => {
    const { observations } = result;
    onDataset(observations && { source: 'grouped', observations, classes: observations });
  }, [result, onDataset]);

  const change = (next: ClassRow[]) => {
    setPasteError(null);
    setRows(next);
  };

  const isOpen = (field: 'lower' | 'upper', row: number, count: number) =>
    field === 'lower' ? openFirst && row === 0 : openLast && row === count - 1;

  const midpoint = (row: ClassRow, i: number) => {
    const lower = isOpen('lower', i, rows.length) ? null : parseCell(row.lower);
    const upper = isOpen('upper', i, rows.length) ? null : parseCell(row.upper);
    return lower === null || upper === null ? '—' : formatNumber((lower + upper) / 2);
  };

  const touched = rows.some((r) => r.lower !== '' || r.upper !== '' || r.f !== '');

  return (
    <div className="space-y-4">
      <EditableTable<ClassRow>
        caption="Sürekli gruplandırılmış tablo"
        columns={[
          {
            field: 'lower',
            label: 'Alt sınır',
            inputMode: 'decimal',
            disabledText: (i, n) => (isOpen('lower', i, n) ? '−∞' : null),
          },
          {
            field: 'upper',
            label: 'Üst sınır',
            inputMode: 'decimal',
            disabledText: (i, n) => (isOpen('upper', i, n) ? '∞' : null),
          },
          { field: 'f', label: 'fᵢ (frekans)', inputMode: 'numeric' },
        ]}
        derived={{ label: 'Orta nokta', value: midpoint }}
        rows={rows}
        errors={result.errors}
        onChange={change}
        // A new class starts where the previous one ends.
        emptyRow={(previous) => ({ ...EMPTY, lower: previous?.upper ?? '' })}
        onPasteText={(text, row) => {
          const pasted = pasteClassRows(text);
          if ('error' in pasted) {
            setPasteError(pasted.error);
            return;
          }
          change([...rows.slice(0, row), ...pasted.rows]);
          if (row === 0) setOpenFirst(pasted.openFirst ?? false);
          setOpenLast(pasted.openLast ?? false);
        }}
        total={result.total}
      />
      <fieldset className="flex flex-wrap gap-x-6">
        <legend className="sr-only">Açık uçlu sınıflar</legend>
        {(
          [
            ['İlk sınıf alttan açık', openFirst, setOpenFirst],
            ['Son sınıf üstten açık', openLast, setOpenLast],
          ] as const
        ).map(([label, checked, set]) => (
          <label key={label} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={checked}
              onChange={(e) => set(e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="hint">
        Sınıflar bitişik olmalıdır: her sınıfın alt sınırı bir önceki sınıfın üst sınırına eşit
        olur (örneğin 10–20, 20–30).
      </p>
      <Messages
        kind="error"
        items={[...(pasteError ? [pasteError] : []), ...(touched ? result.problems : [])]}
      />
    </div>
  );
}
