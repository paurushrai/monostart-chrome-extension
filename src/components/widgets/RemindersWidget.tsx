import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { Bell, Plus, Trash2, X, Repeat, ChevronDown, Check } from 'lucide-react';
import { useWidgetStorage } from '../../hooks/useWidgetStorage';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const upcoming = reminders
      .filter((r) => !r.completed && r.dueAt > now)
      .map((r) => r.dueAt);
    const delay = upcoming.length === 0
      ? 60_000
      : Math.max(50, Math.min(...upcoming) - now + 50);
    const id = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(id);
  }, [reminders, now]);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const due = dueAt.getTime();
    if (Number.isNaN(due)) return;
    const entry: ReminderEntry = {
      id: `r-${crypto.randomUUID()}`,
      text: trimmed,
      dueAt: due,
      recurrence,
    };
    saveReminders((current) => [...current, entry]);
    setText('');
    setDueAt(defaultDueAt());
    setRecurrence('none');
  };

  const toggleComplete = (id: string) => {
    saveReminders((current) => current.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)));
  };

  const removeOne = (id: string) => {
    saveReminders((current) => current.filter((r) => r.id !== id));
  };

  return (
    <article className="card-base w-full h-full relative group overflow-hidden flex flex-col bg-white dark:bg-card">
      <header className={`flex items-center justify-between px-2 border-b border-border bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-xl ${isEditing ? 'py-1.5 drag-handle cursor-grab active:cursor-grabbing' : 'py-1'}`}>
        <div className="flex items-center gap-1.5">
          <Bell size={isEditing ? 14 : 12} className="text-primary" aria-hidden="true" />
          <h3 className={`font-medium text-foreground pointer-events-none ${isEditing ? 'text-sm' : 'text-xs'}`}>{item.title || 'Reminders'}</h3>
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 relative z-20"
            title="Delete Widget"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </header>

      {isEditing && <div className="absolute inset-x-0 bottom-0 top-[48px] z-10 bg-transparent cursor-grab drag-handle" />}

      <ul className="flex-1 overflow-y-auto p-1 space-y-1 list-none">
        {sorted.length === 0 && (
          <li className="text-xs text-muted-foreground text-center mt-4">No reminders yet.</li>
        )}
        {sorted.map((r) => {
          const overdue = !r.completed && r.dueAt <= now;
          return (
            <li
              key={r.id}
              className={`flex items-start gap-2 px-2 py-1 rounded group/item ${overdue ? 'bg-red-50 dark:bg-red-900/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              {r.recurrence === 'none' ? (
                <input
                  type="checkbox"
                  checked={!!r.completed}
                  onChange={() => toggleComplete(r.id)}
                  aria-label={`Mark "${r.text}" as ${r.completed ? 'incomplete' : 'complete'}`}
                  className="mt-1 accent-primary cursor-pointer w-3.5 h-3.5 shrink-0"
                />
              ) : (
                <Repeat size={12} className="text-primary mt-1 shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm break-words ${r.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {r.text}
                </p>
                <p className={`text-2xs mt-0.5 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                  <time dateTime={new Date(r.dueAt).toISOString()}>{formatDue(r.dueAt)}</time>
                  {r.recurrence !== 'none' && <span className="ml-1.5">· {RECURRENCE_LABEL[r.recurrence]}</span>}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOne(r.id)}
                className="h-5 w-5 opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-transparent transition-opacity shrink-0 mt-0.5"
                title="Delete reminder"
              >
                <X size={14} />
              </Button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleAdd} className="p-2 border-t border-border shrink-0 bg-white dark:bg-card rounded-b-xl space-y-1.5">
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Remind me to..."
          aria-label="Reminder text"
          className="h-8 w-full bg-gray-100 dark:bg-white/5 border-none rounded-sm px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
        />
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <DateTimePicker value={dueAt} onChange={setDueAt} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                title="Recurrence"
                className="h-8 px-2 rounded-sm text-xs font-medium bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 shrink-0"
              >
                {RECURRENCE_LABEL[recurrence]}
                <ChevronDown size={12} className="ml-1 opacity-60" aria-hidden="true" />
              </Button>
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
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim()}
            className="h-8 w-8 rounded-sm bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:active:bg-primary/80 disabled:opacity-40 shrink-0"
            title="Add reminder"
          >
            <Plus size={16} strokeWidth={3} />
          </Button>
        </div>
      </form>
    </article>
  );
};

export default RemindersWidget;
