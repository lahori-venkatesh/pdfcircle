import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { X, GripVertical } from 'lucide-react';

interface SortableImageProps {
  id: string;
  preview: string;
  onRemove: (id: string) => void;
  index: number;
}

export function SortableImage({ id, preview, onRemove, index }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.7 : 1,
    scale: isDragging ? 1.1 : 1,
  };

  const handleRemoveClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(id);
  };

  return (
    <div
      ref={setNodeRef}
      className="relative aspect-[3/4] bg-white rounded-lg shadow-md flex items-center justify-center"
      style={style}
      {...attributes}
    >
      <img
        src={preview}
        alt={`Image ${index + 1}`}
        className="absolute inset-0 w-full h-full object-cover rounded-lg"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-red-500 hidden">
        Failed to load image
      </div>
      <button
        className="absolute left-1 top-1 bg-white rounded-full p-2 cursor-move z-20 pointer-events-auto hover:bg-gray-300 transition-colors touch-none"
        {...listeners}
        aria-label={`Drag to reorder image ${index + 1}`}
      >
        <GripVertical className="w-5 h-5 text-indigo-700" />
      </button>
      <button
        onClick={handleRemoveClick}
        onTouchEnd={handleRemoveClick}
        className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-20 pointer-events-auto"
        type="button"
        aria-label={`Remove image ${index + 1}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
}