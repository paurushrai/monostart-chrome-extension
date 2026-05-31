import { useState, useEffect, type FormEvent } from 'react';
import { Clock, Plus, Trash2, X, Play, Pause, RotateCcw } from 'lucide-react';
import { useWidgetStorage } from '../../hooks/useWidgetStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimerWidget as TimerWidgetItem, TimerEntry } from '../../types';

const formatTime = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface TimerItemProps {
  timer: TimerEntry;
  onUpdate: (id: number, updates: Partial<TimerEntry>) => void;
  onDelete: (id: number) => void;
}

const TimerItem = ({ timer, onUpdate, onDelete }: Readonly<TimerItemProps>) => {
  const [timeLeft, setTimeLeft] = useState(timer.remainingMs);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer.isRunning) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = (timer.endTime ?? now) - now;
        if (remaining <= 0) {
          clearInterval(interval);
          setTimeLeft(0);
          onUpdate(timer.id, { isRunning: false, remainingMs: 0, endTime: null });
          try {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch((e) => console.log(e));
          } catch { /* empty */ }
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    } else {
      setTimeLeft(timer.remainingMs);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleStart = () => {
    if (timeLeft <= 0) return;
    onUpdate(timer.id, { 
      isRunning: true, 
      endTime: Date.now() + timeLeft 
    });
  };

  const handlePause = () => {
    onUpdate(timer.id, { 
      isRunning: false, 
      remainingMs: timeLeft,
      endTime: null 
    });
  };

  const handleReset = () => {
    onUpdate(timer.id, { 
      isRunning: false, 
      remainingMs: timer.durationMs,
      endTime: null 
    });
  };

  return (
    <li className="flex flex-col gap-1 p-2 bg-gray-50 dark:bg-white/5 rounded-md relative group">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{timer.label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(timer.id)}
          title="Delete timer"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-transparent transition-opacity"
        >
          <X size={12} />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <time className={`text-2xl font-mono font-semibold tracking-tight ${timeLeft === 0 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
          {formatTime(timeLeft)}
        </time>
        <div className="flex items-center gap-1">
          {timer.isRunning ? (
            <Button type="button" size="icon" onClick={handlePause} title="Pause" className="h-7 w-7 p-0 rounded-full bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/10 dark:text-primary dark:hover:bg-primary/20"><Pause size={14} /></Button>
          ) : (
            <Button type="button" size="icon" onClick={handleStart} title="Start" className="h-7 w-7 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"><Play size={14} className="ml-0.5" /></Button>
          )}
          <Button type="button" size="icon" onClick={handleReset} title="Reset" className="h-7 w-7 p-0 rounded-full bg-gray-200 dark:bg-white/10 text-foreground dark:text-foreground hover:bg-gray-300 dark:hover:bg-white/20"><RotateCcw size={14} /></Button>
        </div>
      </div>
    </li>
  );
};

interface Props {
  item: TimerWidgetItem;
  onDelete: (id: string) => void;
  isEditing: boolean;
}

const TimerWidget = ({ item, onDelete, isEditing }: Readonly<Props>) => {
  const [timers, saveTimers] = useWidgetStorage<TimerEntry[]>(`timer-widget-${item.id}`, []);
  const [newMinutes, setNewMinutes] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const mins = parseInt(newMinutes);
    if (!mins || mins <= 0) return;

    const durationMs = mins * 60 * 1000;
    const newTimer: TimerEntry = {
      id: Date.now(),
      label: newLabel.trim() || `${mins} min Timer`,
      durationMs,
      remainingMs: durationMs,
      isRunning: false,
      endTime: null,
    };
    saveTimers((current) => [...current, newTimer]);
    setNewMinutes("");
    setNewLabel("");
  };

  const updateTimer = (id: number, updates: Partial<TimerEntry>) => {
    saveTimers((current) => current.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTimer = (id: number) => {
    saveTimers((current) => current.filter(t => t.id !== id));
  };

  return (
    <article className="card-base w-full h-full relative group overflow-hidden flex flex-col bg-white dark:bg-card">
      <header className={`flex items-center justify-between px-2 border-b border-border bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-xl ${isEditing ? 'py-1 drag-handle cursor-grab active:cursor-grabbing' : 'py-0.5'}`}>
        <div className="flex items-center gap-1.5">
          <Clock size={isEditing ? 12 : 10} className="text-primary" aria-hidden="true" />
          <h3 className={`font-medium text-foreground pointer-events-none ${isEditing ? 'text-xs' : 'text-2xs'}`}>{item.title || 'Timers'}</h3>
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 relative z-20"
            title="Delete Widget"
          >
            <Trash2 size={13} />
          </Button>
        )}
      </header>

      {isEditing && <div className="absolute inset-x-0 bottom-0 top-[48px] z-10 bg-transparent cursor-grab drag-handle" />}

      <ul className="flex-1 overflow-y-auto p-1 space-y-1 list-none">
        {timers.length === 0 && (
          <li className="text-xs text-muted-foreground text-center mt-4">No timers set.</li>
        )}
        {timers.map(timer => (
          <TimerItem
            key={timer.id}
            timer={timer}
            onUpdate={updateTimer}
            onDelete={deleteTimer}
          />
        ))}
      </ul>

      <form onSubmit={handleAdd} className="p-1.5 border-t border-border shrink-0 bg-white dark:bg-card rounded-b-xl">
        <div className="flex gap-1.5">
          <Input
            type="number"
            min="1"
            max="999"
            value={newMinutes}
            onChange={(e) => setNewMinutes(e.target.value)}
            placeholder="Min"
            aria-label="Timer duration in minutes"
            className="h-7 w-14 bg-gray-100 dark:bg-white/5 border-none rounded-sm px-2 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
          <Input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (opt)"
            aria-label="Timer label (optional)"
            className="h-7 flex-1 min-w-0 bg-gray-100 dark:bg-white/5 border-none rounded-sm px-2 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMinutes}
            title="Add timer"
            className="h-7 w-7 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 disabled:opacity-50 rounded-sm"
          >
            <Plus size={14} />
          </Button>
        </div>
      </form>
    </article>
  );
};

export default TimerWidget;
