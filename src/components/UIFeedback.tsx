'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export interface ModalDialogConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (inputValue?: string) => void;
  onCancel?: () => void;
}

// Komponen Toast Notification Melayang
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-100 flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 ${
            t.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
              : t.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
              : 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            ) : t.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-200" />
            ) : (
              <Info className="w-4 h-4 shrink-0 text-slate-300" />
            )}
            <span className="leading-snug">{t.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0 text-white/80 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Komponen Modal Dialog Pengganti alert(), confirm(), prompt()
export function CustomModalDialog({
  config,
  onClose,
}: {
  config: ModalDialogConfig | null;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = React.useState('');

  useEffect(() => {
    if (config?.isOpen && config.type === 'prompt') {
      setInputValue(config.defaultValue || '');
    }
  }, [config]);

  // Lock scroll saat modal dialog terbuka
  useEffect(() => {
    if (config?.isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouch = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouch;
      };
    }
  }, [config?.isOpen]);

  if (!config || !config.isOpen) return null;

  const handleConfirm = () => {
    if (config.onConfirm) {
      config.onConfirm(config.type === 'prompt' ? inputValue : undefined);
    }
    onClose();
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="my-auto w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 text-center animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          {config.type === 'confirm' ? (
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          ) : config.type === 'prompt' ? (
            <Info className="w-6 h-6 text-emerald-600" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          )}
        </div>

        <div>
          <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 leading-tight">
            {config.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 whitespace-pre-line leading-relaxed">
            {config.message}
          </p>
        </div>

        {config.type === 'prompt' && (
          <div className="text-left">
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-2">
          {config.type !== 'alert' && (
            <button
              type="button"
              onClick={handleCancel}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {config.cancelText || 'Batal'}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className={`${
              config.type === 'alert' ? 'w-full' : 'w-1/2'
            } py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all`}
          >
            {config.confirmText || (config.type === 'alert' ? 'Mengerti' : 'Lanjutkan')}
          </button>
        </div>
      </div>
    </div>
  );
}
