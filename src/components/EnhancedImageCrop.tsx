import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Crop, RotateCcw, Square, Maximize2, Move, ZoomIn, ZoomOut, Grid3X3, Eye, EyeOff } from 'lucide-react';

interface CropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: string | null;
}

interface EnhancedImageCropProps {
  imageSrc: string;
  onCropComplete: (cropData: CropSettings) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ASPECT_RATIOS = [
  { label: 'Free', value: null, ratio: null },
  { label: '1:1', value: '1:1', ratio: 1 },
  { label: '4:3', value: '4:3', ratio: 4/3 },
  { label: '16:9', value: '16:9', ratio: 16/9 },
  { label: '3:2', value: '3:2', ratio: 3/2 },
  { label: '2:3', value: '2:3', ratio: 2/3 },
  { label: '9:16', value: '9:16', ratio: 9/16 },
];

const PRESET_CROPS = [
  { label: 'Center Square', action: 'center-square' },
  { label: 'Full Image', action: 'full' },
  { label: 'Top Half', action: 'top-half' },
  { label: 'Bottom Half', action: 'bottom-half' },
];

export function EnhancedImageCrop({ imageSrc, onCropComplete, onCancel, loading = false }: EnhancedImageCropProps) {
  const [crop, setCrop] = useState<CropSettings>({ x: 0, y: 0, width: 100, height: 100, aspectRatio: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialCrop, setInitialCrop] = useState<CropSettings | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  // Initialize crop when image loads
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    
    // Set initial crop to center 80% of image
    const initialSize = Math.min(img.naturalWidth, img.naturalHeight) * 0.8;
    setCrop({
      x: (img.naturalWidth - initialSize) / 2,
      y: (img.naturalHeight - initialSize) / 2,
      width: initialSize,
      height: initialSize,
      aspectRatio: null
    });
    
    // Reset zoom to 1 for proper initial display
    setZoom(1);
  }, []);

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback((screenX: number, screenY: number) => {
    if (!imageRef.current || !containerRef.current) return { x: 0, y: 0 };
    
    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get the actual displayed image dimensions and position
    const imgRect = img.getBoundingClientRect();
    
    // Calculate the scale factor between natural and displayed image
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;
    
    // Convert screen coordinates to image coordinates
    const x = (screenX - imgRect.left) * scaleX / zoom;
    const y = (screenY - imgRect.top) * scaleY / zoom;
    
    return { 
      x: Math.max(0, Math.min(img.naturalWidth, x)), 
      y: Math.max(0, Math.min(img.naturalHeight, y)) 
    };
  }, [zoom]);

  // Convert image coordinates to screen coordinates
  const imageToScreen = useCallback((imageX: number, imageY: number) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    
    // Calculate scale factors from natural to displayed image
    const scaleX = imgRect.width / img.naturalWidth;
    const scaleY = imgRect.height / img.naturalHeight;
    
    return {
      x: imageX * scaleX * zoom,
      y: imageY * scaleY * zoom
    };
  }, [zoom]);

  // Handle mouse/touch events
  const getEventPosition = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    return {
      x: isTouch ? e.touches[0].clientX : e.clientX,
      y: isTouch ? e.touches[0].clientY : e.clientY
    };
  }, []);

  // Start dragging
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getEventPosition(e);
    const imagePos = screenToImage(pos.x, pos.y);
    
    // Check if click is inside crop area
    if (imagePos.x >= crop.x && imagePos.x <= crop.x + crop.width &&
        imagePos.y >= crop.y && imagePos.y <= crop.y + crop.height) {
      setIsDragging(true);
      setDragStart({ x: imagePos.x - crop.x, y: imagePos.y - crop.y });
    }
  }, [crop, getEventPosition, screenToImage]);

  // Start resizing
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getEventPosition(e);
    const imagePos = screenToImage(pos.x, pos.y);
    
    setIsResizing(corner);
    setInitialCrop(crop);
    setDragStart({ 
      x: imagePos.x, 
      y: imagePos.y
    });
  }, [getEventPosition, screenToImage, crop]);

  // Handle mouse/touch move
  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging && !isResizing) return;
    if (!dragStart) return;
    
    e.preventDefault();
    const pos = getEventPosition(e);
    const imagePos = screenToImage(pos.x, pos.y);
    
    setCrop(prevCrop => {
      let newCrop = { ...prevCrop };
      
      if (isDragging) {
        // Move crop area
        newCrop.x = Math.max(0, Math.min(imageSize.width - prevCrop.width, imagePos.x - dragStart.x));
        newCrop.y = Math.max(0, Math.min(imageSize.height - prevCrop.height, imagePos.y - dragStart.y));
      } else if (isResizing && initialCrop) {
        // Resize crop area with smooth, predictable behavior using initial crop state
        const minSize = 20;
        
        switch (isResizing) {
          case 'nw': {
            // Northwest corner - resize from top-left
            const newWidth = Math.max(minSize, initialCrop.x + initialCrop.width - imagePos.x);
            const newHeight = initialCrop.aspectRatio 
              ? newWidth / getAspectRatio(initialCrop.aspectRatio) 
              : Math.max(minSize, initialCrop.y + initialCrop.height - imagePos.y);
            
            newCrop.width = Math.min(newWidth, initialCrop.x + initialCrop.width);
            newCrop.height = Math.min(newHeight, initialCrop.y + initialCrop.height);
            newCrop.x = initialCrop.x + initialCrop.width - newCrop.width;
            newCrop.y = initialCrop.y + initialCrop.height - newCrop.height;
            break;
          }
          case 'ne': {
            // Northeast corner - resize from top-right
            const newWidth = Math.max(minSize, imagePos.x - initialCrop.x);
            const newHeight = initialCrop.aspectRatio 
              ? newWidth / getAspectRatio(initialCrop.aspectRatio) 
              : Math.max(minSize, initialCrop.y + initialCrop.height - imagePos.y);
            
            newCrop.width = Math.min(newWidth, imageSize.width - initialCrop.x);
            newCrop.height = Math.min(newHeight, initialCrop.y + initialCrop.height);
            newCrop.x = initialCrop.x;
            newCrop.y = initialCrop.y + initialCrop.height - newCrop.height;
            break;
          }
          case 'sw': {
            // Southwest corner - resize from bottom-left
            const newWidth = Math.max(minSize, initialCrop.x + initialCrop.width - imagePos.x);
            const newHeight = initialCrop.aspectRatio 
              ? newWidth / getAspectRatio(initialCrop.aspectRatio) 
              : Math.max(minSize, imagePos.y - initialCrop.y);
            
            newCrop.width = Math.min(newWidth, initialCrop.x + initialCrop.width);
            newCrop.height = Math.min(newHeight, imageSize.height - initialCrop.y);
            newCrop.x = initialCrop.x + initialCrop.width - newCrop.width;
            newCrop.y = initialCrop.y;
            break;
          }
          case 'se': {
            // Southeast corner - resize from bottom-right
            const newWidth = Math.max(minSize, imagePos.x - initialCrop.x);
            const newHeight = initialCrop.aspectRatio 
              ? newWidth / getAspectRatio(initialCrop.aspectRatio) 
              : Math.max(minSize, imagePos.y - initialCrop.y);
            
            newCrop.width = Math.min(newWidth, imageSize.width - initialCrop.x);
            newCrop.height = Math.min(newHeight, imageSize.height - initialCrop.y);
            newCrop.x = initialCrop.x;
            newCrop.y = initialCrop.y;
            break;
          }
        }
        
        // Final bounds checking
        newCrop.x = Math.max(0, Math.min(imageSize.width - newCrop.width, newCrop.x));
        newCrop.y = Math.max(0, Math.min(imageSize.height - newCrop.height, newCrop.y));
        newCrop.width = Math.min(newCrop.width, imageSize.width - newCrop.x);
        newCrop.height = Math.min(newCrop.height, imageSize.height - newCrop.y);
      }
      
      return newCrop;
    });
  }, [isDragging, isResizing, dragStart, imageSize, getEventPosition, screenToImage]);

  // Handle mouse/touch end
  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    setDragStart(null);
    setInitialCrop(null);
  }, []);

  // Get aspect ratio value
  const getAspectRatio = useCallback((aspectRatio: string | null): number => {
    if (!aspectRatio) return 1;
    const [w, h] = aspectRatio.split(':').map(Number);
    return w / h;
  }, []);

  // Apply aspect ratio
  const applyAspectRatio = useCallback((aspectRatio: string | null) => {
    setCrop(prevCrop => {
      if (!aspectRatio) return { ...prevCrop, aspectRatio };
      
      const ratio = getAspectRatio(aspectRatio);
      const newHeight = prevCrop.width / ratio;
      
      return {
        ...prevCrop,
        aspectRatio,
        height: Math.min(newHeight, imageSize.height - prevCrop.y),
        y: Math.max(0, Math.min(prevCrop.y, imageSize.height - newHeight))
      };
    });
  }, [imageSize, getAspectRatio]);

  // Apply preset crop
  const applyPresetCrop = useCallback((action: string) => {
    switch (action) {
      case 'center-square':
        const size = Math.min(imageSize.width, imageSize.height) * 0.8;
        setCrop({
          x: (imageSize.width - size) / 2,
          y: (imageSize.height - size) / 2,
          width: size,
          height: size,
          aspectRatio: '1:1'
        });
        break;
      case 'full':
        setCrop({
          x: 0,
          y: 0,
          width: imageSize.width,
          height: imageSize.height,
          aspectRatio: null
        });
        break;
      case 'top-half':
        setCrop({
          x: 0,
          y: 0,
          width: imageSize.width,
          height: imageSize.height / 2,
          aspectRatio: null
        });
        break;
      case 'bottom-half':
        setCrop({
          x: 0,
          y: imageSize.height / 2,
          width: imageSize.width,
          height: imageSize.height / 2,
          aspectRatio: null
        });
        break;
    }
  }, [imageSize]);

  // Global event listeners
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => handleMove(e);
    const handleGlobalEnd = () => handleEnd();
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalEnd);
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('touchend', handleGlobalEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMove);
        document.removeEventListener('mouseup', handleGlobalEnd);
        document.removeEventListener('touchmove', handleGlobalMove);
        document.removeEventListener('touchend', handleGlobalEnd);
      };
    }
  }, [isDragging, isResizing, handleMove, handleEnd]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Get crop area style
  const getCropStyle = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return {};
    
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate scale factors from natural to displayed image
    const scaleX = imgRect.width / img.naturalWidth;
    const scaleY = imgRect.height / img.naturalHeight;
    
    // Calculate crop position and size in screen coordinates
    const cropLeft = (imgRect.left - containerRect.left) + (crop.x * scaleX * zoom);
    const cropTop = (imgRect.top - containerRect.top) + (crop.y * scaleY * zoom);
    const cropWidth = crop.width * scaleX * zoom;
    const cropHeight = crop.height * scaleY * zoom;
    
    return {
      left: `${cropLeft}px`,
      top: `${cropTop}px`,
      width: `${cropWidth}px`,
      height: `${cropHeight}px`,
    };
  }, [crop, zoom]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Controls Panel */}
      <div className="w-full lg:w-80 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Crop Settings</h3>
        
        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value || 'free'}
                onClick={() => applyAspectRatio(ratio.value)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  crop.aspectRatio === ratio.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Crops */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Presets
          </label>
          <div className="space-y-2">
            {PRESET_CROPS.map((preset) => (
              <button
                key={preset.action}
                onClick={() => applyPresetCrop(preset.action)}
                className="w-full px-3 py-2 text-sm text-left bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Crop Dimensions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dimensions (px)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Width</label>
              <input
                type="number"
                value={Math.round(crop.width)}
                onChange={(e) => {
                  const width = Math.max(20, Math.min(imageSize.width, Number(e.target.value)));
                  setCrop(prev => ({
                    ...prev,
                    width,
                    height: prev.aspectRatio ? width / getAspectRatio(prev.aspectRatio) : prev.height
                  }));
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="20"
                max={imageSize.width}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Height</label>
              <input
                type="number"
                value={Math.round(crop.height)}
                onChange={(e) => {
                  const height = Math.max(20, Math.min(imageSize.height, Number(e.target.value)));
                  setCrop(prev => ({
                    ...prev,
                    height,
                    width: prev.aspectRatio ? height * getAspectRatio(prev.aspectRatio) : prev.width
                  }));
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="20"
                max={imageSize.height}
                disabled={!!crop.aspectRatio}
              />
            </div>
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Position (px)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X</label>
              <input
                type="number"
                value={Math.round(crop.x)}
                onChange={(e) => setCrop(prev => ({
                  ...prev,
                  x: Math.max(0, Math.min(imageSize.width - prev.width, Number(e.target.value)))
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                max={imageSize.width - crop.width}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y</label>
              <input
                type="number"
                value={Math.round(crop.y)}
                onChange={(e) => setCrop(prev => ({
                  ...prev,
                  y: Math.max(0, Math.min(imageSize.height - prev.height, Number(e.target.value)))
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                max={imageSize.height - crop.height}
              />
            </div>
          </div>
        </div>

        {/* View Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            View Options
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center px-3 py-2 text-sm rounded-md border transition-colors ${
                showGrid
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              Grid
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center px-3 py-2 text-sm rounded-md border transition-colors ${
                showPreview
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
              }`}
            >
              {showPreview ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
              Preview
            </button>
          </div>
        </div>

        {/* Zoom */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Zoom: {Math.round(zoom * 100)}%
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image and Crop Area */}
      <div className="flex-1 flex flex-col">
        <div 
          ref={containerRef}
          className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{ minHeight: '500px', maxHeight: '80vh' }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              className="max-w-full max-h-full object-contain cursor-crosshair select-none"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
              draggable={false}
            />
          </div>
          
          {/* Crop Overlay */}
          {imageSize.width > 0 && imageRef.current && (
            <>
              {/* Dark overlay covering the entire container */}
              <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none" />
              
              {/* Crop area */}
              <div
                className="absolute border-2 border-indigo-500 bg-transparent cursor-move z-10"
                style={getCropStyle()}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                {/* Clear area inside crop - this removes the dark overlay from the crop area */}
                <div className="absolute inset-0 bg-white bg-opacity-25 mix-blend-screen pointer-events-none" />
                
                {/* Grid lines */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="border border-indigo-300 border-opacity-50" />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Resize handles */}
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 bg-indigo-600 rounded-full cursor-nw-resize hover:bg-indigo-700 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, 'nw')}
                  onTouchStart={(e) => handleResizeStart(e, 'nw')}
                />
                <div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-600 rounded-full cursor-ne-resize hover:bg-indigo-700 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, 'ne')}
                  onTouchStart={(e) => handleResizeStart(e, 'ne')}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-indigo-600 rounded-full cursor-sw-resize hover:bg-indigo-700 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, 'sw')}
                  onTouchStart={(e) => handleResizeStart(e, 'sw')}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-indigo-600 rounded-full cursor-se-resize hover:bg-indigo-700 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, 'se')}
                  onTouchStart={(e) => handleResizeStart(e, 'se')}
                />
                
                {/* Move icon */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <Move className="w-6 h-6 text-white opacity-75 drop-shadow-lg" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Preview */}
        {showPreview && imageSize.width > 0 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crop Preview ({Math.round(crop.width)} × {Math.round(crop.height)})
            </h4>
            <div className="relative inline-block border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
              <canvas
                className="max-w-full max-h-48 block"
                ref={(canvas) => {
                  if (canvas && imageRef.current && crop.width > 0 && crop.height > 0) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      // Calculate preview size while maintaining aspect ratio
                      const maxPreviewSize = 200;
                      const aspectRatio = crop.width / crop.height;
                      let previewWidth, previewHeight;
                      
                      if (aspectRatio > 1) {
                        previewWidth = Math.min(maxPreviewSize, crop.width);
                        previewHeight = previewWidth / aspectRatio;
                      } else {
                        previewHeight = Math.min(maxPreviewSize, crop.height);
                        previewWidth = previewHeight * aspectRatio;
                      }
                      
                      canvas.width = previewWidth;
                      canvas.height = previewHeight;
                      
                      // Clear canvas
                      ctx.clearRect(0, 0, previewWidth, previewHeight);
                      
                      // Draw the cropped portion
                      try {
                        ctx.drawImage(
                          imageRef.current,
                          crop.x, crop.y, crop.width, crop.height,
                          0, 0, previewWidth, previewHeight
                        );
                      } catch (error) {
                        console.warn('Error drawing preview:', error);
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCropComplete(crop)}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cropping...
              </>
            ) : (
              <>
                <Crop className="w-4 h-4" />
                Apply Crop
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}