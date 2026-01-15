import React, { useState, useCallback, useEffect } from 'react';
import type { Knot } from '../types';

interface DraggableKnotProps {
  index: number;
  knot: Knot;
  isFirst: boolean;
  isLast: boolean;
  prevS: number;
  nextS: number;
  svgRef: React.RefObject<SVGSVGElement | null>;
  toSvgX: (s: number) => number;
  toSvgY: (f: number) => number;
  toDataS: (svgX: number) => number;
  toDataF: (svgY: number) => number;
  fMax: number;
  onKnotChange: (index: number, knot: Knot) => void;
  onRemoveKnot: (index: number) => void;
  canRemove: boolean;
}

const KNOT_RADIUS = 8;
const MIN_S_GAP = 0.02; // Minimum gap between knots
const MIN_F = 0.01;     // Minimum F value

const DraggableKnot: React.FC<DraggableKnotProps> = ({
  index,
  knot,
  isFirst,
  isLast,
  prevS,
  nextS,
  svgRef,
  toSvgX,
  toSvgY,
  toDataS,
  toDataF,
  fMax,
  onKnotChange,
  onRemoveKnot,
  canRemove
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Shift+click to remove knot
    if (e.shiftKey && canRemove && !isFirst && !isLast) {
      e.preventDefault();
      e.stopPropagation();
      onRemoveKnot(index);
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [index, canRemove, isFirst, isLast, onRemoveKnot]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;

    let newS = toDataS(svgX);
    let newF = toDataF(svgY);

    // Apply constraints

    // First and last knots can only move vertically
    if (isFirst) {
      newS = 0;
    } else if (isLast) {
      newS = 1;
    } else {
      // Enforce monotonicity: S must be between neighbors with gap
      newS = Math.max(prevS + MIN_S_GAP, Math.min(nextS - MIN_S_GAP, newS));
    }

    // F must be positive
    newF = Math.max(MIN_F, Math.min(fMax - 0.1, newF));

    onKnotChange(index, { S: newS, F: newF });
  }, [isDragging, svgRef, toDataS, toDataF, isFirst, isLast, prevS, nextS, fMax, index, onKnotChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle right-click to remove
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (canRemove && !isFirst && !isLast) {
      onRemoveKnot(index);
    }
  }, [index, canRemove, isFirst, isLast, onRemoveKnot]);

  const cx = toSvgX(knot.S);
  const cy = toSvgY(knot.F);

  // Determine cursor based on constraints
  let cursor = 'grab';
  if (isDragging) {
    cursor = 'grabbing';
  } else if (isFirst || isLast) {
    cursor = 'ns-resize'; // Vertical only
  }

  // Color coding
  let fillColor = '#2196F3'; // Default blue
  if (isFirst || isLast) {
    fillColor = '#4CAF50'; // Green for endpoints
  }
  if (isHovered) {
    fillColor = isDragging ? '#1565C0' : '#42A5F5';
    if (isFirst || isLast) {
      fillColor = isDragging ? '#2E7D32' : '#66BB6A';
    }
  }

  return (
    <g>
      {/* Larger invisible hit area */}
      <circle
        cx={cx}
        cy={cy}
        r={KNOT_RADIUS + 4}
        fill="transparent"
        style={{ cursor }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={handleContextMenu}
      />
      {/* Visible knot circle */}
      <circle
        cx={cx}
        cy={cy}
        r={isDragging ? KNOT_RADIUS + 2 : KNOT_RADIUS}
        fill={fillColor}
        stroke={isDragging ? '#0D47A1' : '#1976D2'}
        strokeWidth={isDragging ? 3 : 2}
        style={{ 
          cursor,
          transition: isDragging ? 'none' : 'all 0.1s ease',
          pointerEvents: 'none'
        }}
      />
      {/* Knot label on hover */}
      {isHovered && (
        <text
          x={cx}
          y={cy - KNOT_RADIUS - 8}
          textAnchor="middle"
          fontSize="11"
          fill="#333"
          fontWeight="500"
        >
          ({knot.S.toFixed(2)}, {knot.F.toFixed(2)})
        </text>
      )}
    </g>
  );
};

export default DraggableKnot;
