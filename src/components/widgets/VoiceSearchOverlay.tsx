import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RedMicIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#EA4335" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path fill="#EA4335" d="M11 18.92h2V22h-2z"/>
    <path fill="#EA4335" d="M7 11H5c0 1.93.78 3.68 2.05 4.95l1.41-1.41C7.56 13.63 7 12.38 7 11z"/>
    <path fill="#EA4335" d="M12 17c-1.38 0-2.63-.56-3.54-1.47l-1.41 1.41A6.99 6.99 0 0 0 12 19.08c3.86 0 7-3.14 7-7h-2c0 2.76-2.24 5-5 5z"/>
  </svg>
);

interface Props {
  open: boolean;
  onClose: () => void;
  transcript: string;
}

const VoiceSearchOverlay = ({ open, onClose, transcript }: Readonly<Props>) => {
  if (!open) return null;

  return createPortal(
    <dialog open aria-modal="true" aria-label="Voice search" className="fixed inset-0 z-[100] bg-[#202124] w-screen h-screen max-w-none max-h-none flex items-center justify-center overflow-hidden animate-in fade-in duration-200">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        title="Close"
        className="absolute top-6 right-6 h-10 w-10 p-2 text-[#9aa0a6] hover:text-white hover:bg-transparent transition-colors"
      >
        <X size={28} />
      </Button>

      <div className="flex items-center gap-10">
        <p className="text-[#9aa0a6] text-3xl font-light min-w-[200px] text-right" aria-live="polite">
          {transcript || 'Listening...'}
        </p>
        <div className="w-24 h-24 rounded-full border border-[#5f6368] flex items-center justify-center bg-[#202124] shadow-lg relative">
          <div className="absolute inset-0 rounded-full border border-[#5f6368] animate-ping opacity-20"></div>
          <RedMicIcon size={40} />
        </div>
      </div>
    </dialog>,
    document.body
  );
};

export default VoiceSearchOverlay;
