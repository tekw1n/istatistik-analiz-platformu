import { useEffect, useMemo, useState } from 'react';
import { Messages } from '../../../components/ui/Messages';
import {
  fillMissingCategories,
  pasteFrequencyRows,
  readFrequencyTable,
  sortRows,
  type FrequencyRow,
} from '../tables';
import type { Dataset } from '../types';
import { EditableTable } from './EditableTable';

const EMPTY: FrequencyRow = { x: '', f: '' };

interface Props {
  initial?: { rows: FrequencyRow[]; openLast: boolean };
  onDataset(dataset: Dataset | null): void;
}

export function FrequencyForm({ initial, onDataset }: Props) {
  const [rows, setRows] = useState(initial?.rows ?? [EMPTY, EMPTY, EMPTY]);
  const [openLast, setOpenLast] = useState(initial?.openLast ?? false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const result = useMemo(() => readFrequencyTable(rows, openLast), [rows, openLast]);

  useEffect(() => {
    const { observations } = result;
    onDataset(observations && { source: 'frequency', observations, classes: null });
  }, [result, onDataset]);

  const change = (next: FrequencyRow[]) => {
    setPasteError(null);
    setRows(next);
  };

  const touched = rows.some((r) => r.x !== '' || r.f !== '');

  return (
    <div className="space-y-4">
      <EditableTable<FrequencyRow>
        caption="Kesikli frekans tablosu"
        columns={[
          { field: 'x', label: 'xᵢ (değer)', inputMode: 'numeric' },
          { field: 'f', label: 'fᵢ (frekans)', inputMode: 'numeric' },
        ]}
        rows={rows}
        errors={result.errors}
        onChange={change}
        emptyRow={() => EMPTY}
        onPasteText={(text, row) => {
          const pasted = pasteFrequencyRows(text);
          if ('error' in pasted) setPasteError(pasted.error);
          else change([...rows.slice(0, row), ...pasted.rows]);
        }}
        total={result.total}
        toolbar={
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={openLast}
                onChange={(e) => setOpenLast(e.target.checked)}
              />
              <span>
                Son satır açık uçlu sınıftır (X ≥ x<sub>k</sub>)
              </span>
            </label>
            <button
              type="button"
              className="btn-secondary"
              disabled={!result.warnings.length}
              onClick={() => change(fillMissingCategories(rows))}
            >
              Eksik değerleri 0 frekansla tamamla
            </button>
            {rows.length > 1 &&
              result.errors.some((e) => e.message.includes('sıralanmalıdır')) && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => change(sortRows(rows))}
                >
                  Satırları sırala
                </button>
              )}
          </>
        }
      />
      <Messages
        kind="error"
        items={[...(pasteError ? [pasteError] : []), ...(touched ? result.problems : [])]}
      />
      <Messages kind="warning" items={result.warnings} />
    </div>
  );
}
