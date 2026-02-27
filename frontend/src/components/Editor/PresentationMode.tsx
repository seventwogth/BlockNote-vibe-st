import { useState, useEffect, useCallback } from 'react';

interface Block {
  id: string;
  type: string;
  content: string;
}

interface PresentationModeProps {
  blocks: Block[];
  title: string;
  onClose: () => void;
}

export function PresentationMode({ blocks, title, onClose }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = blocks.filter(b => 
    b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3'
  );

  const goToNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  const currentBlock = slides[currentSlide];
  const blockIndex = blocks.findIndex(b => b.id === currentBlock?.id);
  let slideContent: React.ReactNode = null;

  if (currentBlock) {
    const content = currentBlock.content.replace(/<[^>]*>/g, '');
    
    if (currentBlock.type === 'heading1') {
      slideContent = (
        <h1 className="text-6xl font-bold text-center mb-8">{content || 'Untitled'}</h1>
      );
    } else if (currentBlock.type === 'heading2') {
      slideContent = (
        <h2 className="text-5xl font-semibold text-center mb-8">{content}</h2>
      );
    } else {
      slideContent = (
        <h3 className="text-4xl font-medium text-center mb-8">{content}</h3>
      );
    }

    const followingBlocks = blocks.slice(blockIndex + 1).filter(b => 
      !['heading1', 'heading2', 'heading3'].includes(b.type)
    ).slice(0, 5);

    if (followingBlocks.length > 0) {
      slideContent = (
        <>
          {slideContent}
          <div className="mt-12 space-y-4">
            {followingBlocks.map(b => {
              const text = b.content.replace(/<[^>]*>/g, '').trim();
              if (!text) return null;
              
              if (b.type === 'bullet') {
                return <div key={b.id} className="text-2xl text-center text-gray-600">• {text}</div>;
              } else if (b.type === 'numbered') {
                return <div key={b.id} className="text-2xl text-center text-gray-600">{text}</div>;
              } else if (b.type === 'todo') {
                return (
                  <div key={b.id} className="text-2xl text-center text-gray-600 flex items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-gray-400 rounded" /> {text}
                  </div>
                );
              }
              return <div key={b.id} className="text-2xl text-center text-gray-600">{text}</div>;
            })}
          </div>
        </>
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          ✕ Exit (Esc)
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-16">
        <div className="max-w-4xl w-full">
          {slideContent || (
            <div className="text-center text-gray-400">
              <p className="text-2xl">No headings found</p>
              <p className="mt-4">Add H1, H2, or H3 headings to create slides</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t flex items-center justify-between bg-gray-50">
        <div className="text-sm text-gray-500">
          {title}
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={goToPrev}
            disabled={currentSlide === 0}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
          >
            ← Previous
          </button>
          
          <span className="text-sm text-gray-500">
            {slides.length > 0 ? `${currentSlide + 1} / ${slides.length}` : '0 slides'}
          </span>
          
          <button
            onClick={goToNext}
            disabled={currentSlide >= slides.length - 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        <div className="w-24" />
      </div>
    </div>
  );
}
