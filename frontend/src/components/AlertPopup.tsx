import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface AlertPopupProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

const AlertPopup: React.FC<AlertPopupProps> = ({ isOpen, type, message, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bgColors = {
    success: 'bg-[#0f2e23] border-[#1a4a38]',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    success: 'text-white',
    error: 'text-red-800',
    info: 'text-blue-800'
  };

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
      <div className={`flex items-start gap-4 p-4 rounded-xl border shadow-lg max-w-sm ${bgColors[type]}`}>
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${textColors[type]}`} />
        <div className="flex-1">
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
