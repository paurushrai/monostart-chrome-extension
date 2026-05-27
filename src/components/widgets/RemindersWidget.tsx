import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { Bell, Plus, Trash2, X, Repeat, ChevronDown, Check } from 'lucide-react';
import { useWidgetStorage } from '../../hooks/useWidgetStorage';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { Reminders as RemindersItem, ReminderEntry } from '../../types';

interface Props {
  item: RemindersItem;
  onDelete: (id: string) => void;
  isEditing: boolean;
}

const RECURRENCE_LABEL: Record<ReminderEntry['recurrence'], string> = {
  none: 'Once',
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
};

const RECURRENCE_OPTIONS: ReadonlyArray<ReminderEntry['recurrence']> = ['none', 'hourly', 'daily', 'weekly'];

const defaultDueAt = (): Date => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d;
};

const formatDue = (epochMs: number): string => {
  const d = new Date(epochMs);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const sameAsTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  if (sameAsTomorrow) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
};

const RemindersWidget = ({ item, onDelete, isEditing }: Readonly<Props>) => {
  const [reminders, saveReminders] = useWidgetStorage<ReminderEntry[]>(`reminders-widget-${item.id}`, []);
  const [text, setText] = useState('');
  const [dueAt, setDueAt] = useState<Date>(defaultDueAt);
  const [recurrence, setRecurrence] = useState<ReminderEntry['recurrence']>('none');

  const sorted = useMemo(
    () => [...reminders].sort((a, b) => a.dueAt - b.dueAt),
    [reminders],
  );

  // Re-render at the exact moment of the next upcoming dueAt (or every 60s
  // as heartbeat if nothing is upcoming). Don't hold `now` in state — that
  // makes the value stale when the storage listener triggers a re-render
  // (effect cleanup clears the just-about-to-fire timer). Read Date.now()
  // fresh in the render body so every re-render reflects current time.
  const [, setTick] = useState(0);
  useEffect(() => {
    const current = Date.now();
    const upcoming = reminders
      .filter((r) => !r.completed && r.dueAt > current)
      .map((r) => r.dueAt);
    const delay = upcoming.length === 0
      ? 60_000
      : Math.max(50, Math.min(...upcoming) - current + 50);
    const id = setTimeout(() => setTick((n) => n + 1), delay);
    return () => clearTimeout(id);
  }, [reminders]);
  const now = Date.now();

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const due = dueAt.getTime();
    if (Number.isNaN(due)) return;
    const entry: ReminderEntry = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      dueAt: due,
      recurrence,
    };
    saveReminders([...reminders, entry]);
    setText('');
    setDueAt(defaultDueAt());
    setRecurrence('none');
  };

  const toggleComplete = (id: string) => {
    saveReminders(reminders.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  };

  const removeOne = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
  };

  return (
    <div className="card-base w-full h-full relative group overflow-hidden flex flex-col bg-white dark:bg-card">
      <div className={`flex items-center justify-between px-2 py-1 border-b border-border bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-xl ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>
        <div className="flex items-center gap-1.5">
          <Bell size={12} className="text-primary" />
          <span className="text-xs font-medium text-foreground pointer-events-none">{item.title || 'Reminders'}</span>
        </div>
        {isEditing && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="flex items-center justify-center h-5 w-5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 relative z-20"
            title="Delete Widget"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {isEditing && <div className="absolute inset-x-0 bottom-0 top-[45px] z-10 bg-transparent cursor-grab drag-handle" />}

      <div className="flex-1 overflow-y-auto p-1 space-y-1">
        {sorted.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">No reminders yet.</div>
        )}
        {sorted.map((r) => {
          const overdue = !r.completed && r.dueAt <= now;
          return (
            <div
              key={r.id}
              className={`flex items-start gap-2 px-2 py-1 rounded group/item ${overdue ? 'bg-red-50 dark:bg-red-900/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              {r.recurrence === 'none' ? (
                <input
                  type="checkbox"
                  checked={!!r.completed}
                  onChange={() => toggleComplete(r.id)}
                  className="mt-1 accent-primary cursor-pointer w-3.5 h-3.5 shrink-0"
                />
              ) : (
                <Repeat size={12} className="text-primary mt-1 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm break-words ${r.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {r.text}
                </div>
                <div className={`text-2xs mt-0.5 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                  {formatDue(r.dueAt)}
                  {r.recurrence !== 'none' && <span className="ml-1.5">· {RECURRENCE_LABEL[r.recurrence]}</span>}
                </div>
              </div>
              <button
                onClick={() => removeOne(r.id)}
                className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity shrink-0 mt-0.5"
                title="Delete reminder"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="p-2 border-t border-border shrink-0 bg-white dark:bg-card rounded-b-xl space-y-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Remind me to..."
          className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-md py-1.5 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
        />
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <DateTimePicker value={dueAt} onChange={setDueAt} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Recurrence"
                className="flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 outline-none focus:ring-1 focus:ring-primary shrink-0"
              >
                {RECURRENCE_LABEL[recurrence]}
                <ChevronDown size={12} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[110px]">
              {RECURRENCE_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt}
                  onClick={() => setRecurrence(opt)}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="w-3.5 inline-flex justify-center">
                    {recurrence === opt && <Check size={12} />}
                  </span>
                  <span>{RECURRENCE_LABEL[opt]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex items-center justify-center h-7 w-7 rounded-lg bg-green-500 text-white shadow-sm hover:bg-green-600 active:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Add reminder"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default RemindersWidget;
