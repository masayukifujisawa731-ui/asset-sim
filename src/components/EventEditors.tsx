import type { BigExpense, LifeEvent } from '../lib/types';
import { Field } from './Field';

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random()}`;

export function LifeEventEditor({
  events,
  onChange,
}: {
  events: LifeEvent[];
  onChange: (e: LifeEvent[]) => void;
}) {
  const update = (id: string, patch: Partial<LifeEvent>) =>
    onChange(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => onChange(events.filter((e) => e.id !== id));
  const add = () =>
    onChange([
      ...events,
      { id: newId(), age: 45, label: '新しい変化', expenseDeltaMonthly: 0, investDeltaMonthly: 0 },
    ]);

  return (
    <>
      {events.map((e) => (
        <div className="event-row" key={e.id}>
          <div className="er-head">
            <input
              className="er-label"
              value={e.label}
              onChange={(ev) => update(e.id, { label: ev.target.value })}
              placeholder="イベント名"
            />
            <button className="btn-remove" onClick={() => remove(e.id)} title="削除">✕</button>
          </div>
          <div className="er-grid">
            <div className="mini-field">
              <label>年齢</label>
              <Field
                compact
                value={e.age}
                stepFine={1}
                unit="歳〜"
                onChange={(v) => update(e.id, { age: v })}
                ariaLabel="年齢"
              />
            </div>
            <div className="mini-field">
              <label>月支出の変化（±）</label>
              <Field
                compact
                value={e.expenseDeltaMonthly / 10000}
                stepFine={1}
                unit="万円"
                onChange={(v) => update(e.id, { expenseDeltaMonthly: Math.round(v * 10000) })}
                ariaLabel="月支出の変化"
              />
            </div>
            <div className="mini-field">
              <label>月投資額の変化（±）</label>
              <Field
                compact
                value={e.investDeltaMonthly / 10000}
                stepFine={1}
                unit="万円"
                onChange={(v) => update(e.id, { investDeltaMonthly: Math.round(v * 10000) })}
                ariaLabel="月投資額の変化"
              />
            </div>
          </div>
        </div>
      ))}
      <button className="btn-add" onClick={add}>＋ ライフステージの変化を追加</button>
    </>
  );
}

export function BigExpenseEditor({
  items,
  onChange,
}: {
  items: BigExpense[];
  onChange: (e: BigExpense[]) => void;
}) {
  const update = (id: string, patch: Partial<BigExpense>) =>
    onChange(items.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => onChange(items.filter((e) => e.id !== id));
  const add = () => onChange([...items, { id: newId(), age: 45, label: '住宅・車など', amount: 0 }]);

  return (
    <>
      {items.map((e) => (
        <div className="event-row" key={e.id}>
          <div className="er-head">
            <input
              className="er-label"
              value={e.label}
              onChange={(ev) => update(e.id, { label: ev.target.value })}
              placeholder="出費の名前"
            />
            <button className="btn-remove" onClick={() => remove(e.id)} title="削除">✕</button>
          </div>
          <div className="er-grid">
            <div className="mini-field">
              <label>年齢</label>
              <Field
                compact
                value={e.age}
                stepFine={1}
                unit="歳"
                onChange={(v) => update(e.id, { age: v })}
                ariaLabel="年齢"
              />
            </div>
            <div className="mini-field">
              <label>金額</label>
              <Field
                compact
                value={e.amount / 10000}
                stepFine={10}
                min={0}
                unit="万円"
                onChange={(v) => update(e.id, { amount: Math.round(v * 10000) })}
                ariaLabel="金額"
              />
            </div>
          </div>
        </div>
      ))}
      <button className="btn-add" onClick={add}>＋ 大型イベント出費を追加</button>
    </>
  );
}
