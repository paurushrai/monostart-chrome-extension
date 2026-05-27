import { useState, type FormEvent } from 'react';
import { CheckSquare, Plus, Trash2, X } from 'lucide-react';
import { useWidgetStorage } from '../../hooks/useWidgetStorage';
import type { TodoWidget as TodoWidgetItem, TodoEntry } from '../../types';

interface Props {
  item: TodoWidgetItem;
  onDelete: (id: string) => void;
  isEditing: boolean;
}

const TodoWidget = ({ item, onDelete, isEditing }: Readonly<Props>) => {
  const [todos, saveTodos] = useWidgetStorage<TodoEntry[]>(`todo-widget-${item.id}`, []);
  const [newTask, setNewTask] = useState("");

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    saveTodos([...todos, { id: Date.now(), text: newTask.trim(), completed: false }]);
    setNewTask("");
  };

  const toggleTodo = (id: number) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTodos(updated);
  };

  const deleteTodo = (id: number) => {
    const updated = todos.filter(t => t.id !== id);
    saveTodos(updated);
  };

  return (
    <div className="card-base w-full h-full relative group overflow-hidden flex flex-col bg-white dark:bg-card">
      <div className={`flex items-center justify-between px-2 py-1 border-b border-border bg-gray-50/50 dark:bg-black/10 shrink-0 rounded-t-xl ${isEditing ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>
        <div className="flex items-center gap-1.5">
          <CheckSquare size={12} className="text-primary" />
          <span className="text-xs font-medium text-foreground pointer-events-none">{item.title || 'Todos'}</span>
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
        {todos.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">No tasks yet.</div>
        )}
        {todos.map(todo => (
          <div key={todo.id} className="flex items-start gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-white/5 rounded group/item">
            <input 
              type="checkbox" 
              checked={todo.completed} 
              onChange={() => toggleTodo(todo.id)}
              className="mt-1 accent-primary cursor-pointer w-3.5 h-3.5 shrink-0"
            />
            <span className={`text-sm flex-1 min-w-0 break-words ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {todo.text}
            </span>
            <button 
              onClick={() => deleteTodo(todo.id)}
              className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity shrink-0 mt-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="p-2 border-t border-border shrink-0 bg-white dark:bg-card rounded-b-xl">
        <div className="relative">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a task..."
            className="w-full bg-gray-100 dark:bg-white/5 border-none rounded-md py-1.5 pl-3 pr-8 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
          <button type="submit" disabled={!newTask.trim()} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-primary disabled:opacity-50 hover:bg-primary/10 rounded">
            <Plus size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default TodoWidget;
