// src/features/floorplan/components/BlueprintScaler.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface BlueprintScalerProps {
  children: React.ReactNode;
  /** Natural unscaled width of the blueprint (default: 436px) */
  naturalWidth?: number;
  /** Natural unscaled height of the blueprint (default: 560px) */
  naturalHeight?: number;
  /** Whether to display compact zoom controls (default: true on mobile) */
  showControls?: boolean;
  className?: string;
}

export const BlueprintScaler: React.FC<BlueprintScalerProps> = ({
  children,
  naturalWidth = 436,
  naturalHeight = 560,
  showControls = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(naturalWidth);
  const [isFitMode, setIsFitMode] = useState(true);
  const [manualScale, setManualScale] = useState(1);
  const [fitScale, setFitScale] = useState(0.8);

  // Dynamically observe container width and calculate scale
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth;
        if (clientW > 0) {
          setContainerWidth(clientW);
          // Calculate scale to fit container width cleanly with 4px padding
          const availableW = Math.max(clientW - 6, 260);
          const calculated = Math.min(1.05, availableW / naturalWidth);
          const rounded = Math.max(0.48, Number(calculated.toFixed(3)));
          setFitScale(rounded);
        }
      }
    };

    updateDimensions();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    // Double check after modal animations complete
    const timeoutId = setTimeout(updateDimensions, 150);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeoutId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [naturalWidth]);

  const currentScale = isFitMode ? fitScale : manualScale;

  const handleZoomIn = () => {
    setIsFitMode(false);
    setManualScale((prev) => Math.min(Number((prev + 0.08).toFixed(2)), 1.35));
  };

  const handleZoomOut = () => {
    setIsFitMode(false);
    setManualScale((prev) => Math.max(Number((prev - 0.08).toFixed(2)), 0.45));
  };

  const handleReset100 = () => {
    setIsFitMode(false);
    setManualScale(1);
  };

  const handleToggleFit = () => {
    setIsFitMode((prev) => !prev);
  };

  const scaledHeight = Math.round(naturalHeight * currentScale);

  return (
    <div
      ref={containerRef}
      id="blueprint-scaler-wrapper"
      className={`w-full flex flex-col items-center select-none ${className}`}
    >
      {/* Zoom / Viewport Bar */}
      {showControls && (
        <div
          id="blueprint-scaler-toolbar"
          className="w-full flex items-center justify-between px-1 py-1 mb-1 text-[11px] text-slate-400 border-b border-slate-800/80"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Tỷ lệ:</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold border border-slate-700">
              {Math.round(currentScale * 100)}%
            </span>
            {isFitMode && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Tự căn chuẩn
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleFit}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                isFitMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Tự động thu phóng vừa với màn hình điện thoại"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span>{isFitMode ? 'Vừa khung' : 'Tự do'}</span>
            </button>

            <button
              type="button"
              onClick={handleZoomOut}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-bold"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={handleReset100}
              className={`px-1.5 h-5 flex items-center justify-center rounded text-[9px] font-mono border transition-colors ${
                !isFitMode && manualScale === 1
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Kích thước 100%"
            >
              <RotateCcw className="w-2.5 h-2.5 mr-0.5" /> 100%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-bold"
              title="Phóng to"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Scaled Blueprint Container */}
      <div
        id="blueprint-scaled-viewport"
        className="w-full flex justify-center items-start overflow-x-auto overflow-y-hidden [touch-action:pan-y]"
        style={{
          height: `${scaledHeight}px`,
          maxWidth: '100%',
        }}
      >
        <div
          id="blueprint-scaled-inner"
          style={{
            transform: `scale(${currentScale})`,
            transformOrigin: 'top center',
            width: `${naturalWidth}px`,
            minWidth: `${naturalWidth}px`,
            marginBottom: `-${Math.round(naturalHeight * (1 - currentScale))}px`,
          }}
          className="transition-transform duration-150 ease-out shrink-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
