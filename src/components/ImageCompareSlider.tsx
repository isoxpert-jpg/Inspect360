import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ImageCompareSliderProps {
    original: string;
    overlay: string;
    labelOriginal?: string;
    labelOverlay?: string;
}

export function ImageCompareSlider({
    original,
    overlay,
    labelOriginal = "Original",
    labelOverlay = "Analysis"
}: ImageCompareSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percent);
    };

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleMove(e.clientX);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
    };

    useEffect(() => {
        const handleWindowMove = (e: MouseEvent) => {
            if (isDragging) handleMove(e.clientX);
        };
        const handleWindowUp = () => setIsDragging(false);

        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) handleMove(e.touches[0].clientX);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleWindowMove);
            window.addEventListener('mouseup', handleWindowUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleWindowUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleWindowMove);
            window.removeEventListener('mouseup', handleWindowUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleWindowUp);
        };
    }, [isDragging]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-96 rounded-xl overflow-hidden cursor-col-resize select-none shadow-sm border border-slate-200 group touch-none"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            {/* Background: Analysis Overlay */}
            <img
                src={overlay}
                className="absolute inset-0 w-full h-full object-cover"
                alt="Analysis"
            />
            <div className="absolute top-4 right-4 bg-blue-900/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none z-10">
                {labelOverlay}
            </div>

            {/* Foreground: Original (Clipped) */}
            <div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img
                    src={original}
                    className="absolute inset-0 w-full h-full object-cover"
                    alt="Original"
                />
                <div className="absolute top-4 left-4 bg-slate-900/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                    {labelOriginal}
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize z-20"
                style={{ left: `${sliderPosition}%` }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 border border-slate-100">
                    <GripVertical className="w-4 h-4" />
                </div>
            </div>

            {/* Interaction Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Drag to compare
            </div>
        </div>
    );
}
