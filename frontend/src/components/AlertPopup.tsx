import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface AlertPopupProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  onClose: () => void;
}

const AlertPopup: React.FC<AlertPopupProps> = ({ isOpen, type, title, message, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200'
  };

  const textColors = {
    success: 'text-emerald-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-amber-800'
  };

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
      <div className={`flex items-start gap-4 p-4 rounded-xl border shadow-lg max-w-sm ${bgColors[type]}`}>
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${textColors[type]}`} />
        <div className="flex-1">
          {title && <h4 className={`text-sm font-bold ${textColors[type]}`}>{title}</h4>}
          <p className={`text-sm font-medium ${textColors[type]}`}>
            {message}
          </p>
        </div>
        <button 
          onClick={onClose}
          className={`p-1 hover:bg-black/10 rounded-lg transition-colors ${textColors[type]}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AlertPopup;
