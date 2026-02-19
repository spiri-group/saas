'use client';

import { useEffect, useState, useCallback, useRef } from "react";
import { Check } from "lucide-react";

type Props = {
  show: boolean;
  onComplete: () => void;
};

const SaleSuccessOverlay = ({ show, onComplete }: Props) => {
  const [phase, setPhase] = useState<'idle' | 'enter' | 'visible' | 'exit'>('idle');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const skipToComplete = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('idle');
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (show) {
      setPhase('enter');
      const t1 = setTimeout(() => setPhase('visible'), 30);
      const t2 = setTimeout(() => setPhase('exit'), 350);
      const t3 = setTimeout(() => {
        setPhase('idle');
        onComplete();
      }, 500);
      timersRef.current = [t1, t2, t3];
      return () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
      };
    }
  }, [show, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-150 cursor-pointer ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={skipToComplete}
      data-testid="pos-success-overlay"
    >
      <div
        className={`flex flex-col items-center transition-all duration-200 ${
          phase === 'enter' ? 'scale-50 opacity-0' : phase === 'exit' ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <div
          className="flex items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30"
          style={{ width: 80, height: 80 }}
        >
          <Check
            className={`h-10 w-10 text-white transition-all duration-150 ${
              phase === 'visible' ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            strokeWidth={3}
          />
        </div>
        <p
          className={`mt-3 text-lg font-bold text-white transition-all duration-150 ${
            phase === 'visible' ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          Sale Complete!
        </p>
      </div>
    </div>
  );
};

export default SaleSuccessOverlay;
