import { useState, useEffect, useCallback, useRef } from 'react';

interface BoardElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  label?: string;
  color: string;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
}

interface BoardPresentationProps {
  elements: BoardElement[];
  title: string;
  onClose: () => void;
}

export function BoardPresentation({ elements, title, onClose }: BoardPresentationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, elements.length - 1));
  }, [elements.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(s * 1.2, 3));
      } else if (e.key === '-') {
        setScale(s => Math.max(s * 0.8, 0.3));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      const currentEl = elements[currentIndex];
      
      if (currentEl) {
        const targetX = centerX - (currentEl.x + currentEl.width / 2);
        const targetY = centerY - (currentEl.y + currentEl.height / 2);

        ctx.translate(targetX, targetY);
      }

      elements.forEach((el, idx) => {
        const isCurrent = idx === currentIndex;
        const opacity = isCurrent ? 1 : 0.3;
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = el.color;
        ctx.strokeStyle = isCurrent ? '#3b82f6' : '#00000020';
        ctx.lineWidth = isCurrent ? 3 : 1;

        switch (el.type) {
          case 'rectangle':
            ctx.beginPath();
            ctx.roundRect(el.x, el.y, el.width, el.height, 8);
            ctx.fill();
            ctx.stroke();
            break;
          case 'ellipse':
            ctx.beginPath();
            ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'text':
            if (el.content) {
              ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize || 16}px ${el.fontFamily || 'sans-serif'}`;
              ctx.fillStyle = el.color;
              ctx.fillText(el.content, el.x, el.y + (el.fontSize || 16));
            }
            break;
          case 'sticky':
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.roundRect(el.x, el.y, el.width, el.height, 4);
            ctx.fill();
            ctx.stroke();
            break;
        }

        if (el.label && (el.type === 'arrow' || el.type === 'connector')) {
          ctx.globalAlpha = opacity;
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#374151';
          ctx.textAlign = 'center';
          const midX = ((el.startPoint?.x || 0) + (el.endPoint?.x || 0)) / 2;
          const midY = ((el.startPoint?.y || 0) + (el.endPoint?.y || 0)) / 2;
          ctx.fillText(el.label, midX, midY - 10);
        }
      });

      ctx.restore();
    };

    render();
  }, [elements, currentIndex, scale]);

  return (
    <div className="fixed inset-0 bg-white z-[100]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      <div className="absolute top-4 left-4 flex items-center gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          ✕ Exit (Esc)
        </button>
        <span className="text-sm text-gray-500">{title}</span>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setScale(s => Math.max(s * 0.8, 0.3))}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          -
        </button>
        <span className="text-sm text-gray-500 w-16 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(s => Math.min(s * 1.2, 3))}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          +
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
        >
          ← Previous
        </button>
        
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {elements.length}
        </span>
        
        <button
          onClick={goNext}
          disabled={currentIndex >= elements.length - 1}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
