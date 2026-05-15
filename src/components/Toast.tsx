interface Props {
  message: string | null;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-5 py-3 bg-card border border-border rounded-lg shadow-2xl text-foreground max-w-sm text-center text-sm cursor-pointer backdrop-blur-sm"
    >
      {message}
    </div>
  );
}
