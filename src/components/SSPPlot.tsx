import React, { useRef, useCallback } from 'react';
import type { Knot } from '../types';
import DraggableKnot from './DraggableKnot';
import OutputPoints from './OutputPoints';

interface SSPPlotProps {
  knots: Knot[];
  si: number[];
  onKnotChange: (index: number, knot: Knot) => void;
  onAddKnot: (S: number, F: number) => void;
  onRemoveKnot: (index: number) => void;
}

// Plot dimensions and margins
const WIDTH = 600;
const HEIGHT = 400;
const MARGIN = { top: 30, right: 30, bottom: 50, left: 50 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

// Scale configuration
const S_MIN = 0;
const S_MAX = 1;
const F_MIN = 0;
const F_MAX = 2.5;

// Convert data coordinates to SVG coordinates
function toSvgX(s: number): number {
  return MARGIN.left + ((s - S_MIN) / (S_MAX - S_MIN)) * PLOT_WIDTH;
}

function toSvgY(f: number): number {
  return MARGIN.top + PLOT_HEIGHT - ((f - F_MIN) / (F_MAX - F_MIN)) * PLOT_HEIGHT;
}

// Convert SVG coordinates to data coordinates
function toDataS(svgX: number): number {
  return S_MIN + ((svgX - MARGIN.left) / PLOT_WIDTH) * (S_MAX - S_MIN);
}

function toDataF(svgY: number): number {
  return F_MIN + ((MARGIN.top + PLOT_HEIGHT - svgY) / PLOT_HEIGHT) * (F_MAX - F_MIN);
}

// Generate axis ticks
function generateTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    ticks.push(min + i * step);
  }
  return ticks;
}

const SSPPlot: React.FC<SSPPlotProps> = ({
  knots,
  si,
  onKnotChange,
  onAddKnot,
  onRemoveKnot
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Handle click on plot area to add new knot
  const handlePlotClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (e.shiftKey) return; // Shift+click is for removal
    
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    
    // Check if click is within plot area
    if (svgX < MARGIN.left || svgX > WIDTH - MARGIN.right ||
        svgY < MARGIN.top || svgY > HEIGHT - MARGIN.bottom) {
      return;
    }
    
    const S = Math.max(0.01, Math.min(0.99, toDataS(svgX)));
    const F = Math.max(0.01, Math.min(F_MAX - 0.1, toDataF(svgY)));
    
    onAddKnot(S, F);
  }, [onAddKnot]);

  // Generate grid lines
  const sTicks = generateTicks(S_MIN, S_MAX, 10);
  const fTicks = generateTicks(F_MIN, F_MAX, 5);

  // Build path for the piecewise-linear function line
  const linePath = knots.length >= 2
    ? `M ${knots.map(k => `${toSvgX(k.S)},${toSvgY(k.F)}`).join(' L ')}`
    : '';

  return (
    <svg
      ref={svgRef}
      width={WIDTH}
      height={HEIGHT}
      style={{ 
        border: '1px solid #ccc', 
        borderRadius: '4px',
        backgroundColor: '#fafafa'
      }}
    >
      {/* Grid lines */}
      <g className="grid" stroke="#e0e0e0" strokeWidth="1">
        {/* Vertical grid lines (S axis) */}
        {sTicks.map(s => (
          <line
            key={`v-${s}`}
            x1={toSvgX(s)}
            y1={MARGIN.top}
            x2={toSvgX(s)}
            y2={HEIGHT - MARGIN.bottom}
          />
        ))}
        {/* Horizontal grid lines (F axis) */}
        {fTicks.map(f => (
          <line
            key={`h-${f}`}
            x1={MARGIN.left}
            y1={toSvgY(f)}
            x2={WIDTH - MARGIN.right}
            y2={toSvgY(f)}
          />
        ))}
      </g>

      {/* Axes */}
      <g className="axes" stroke="#333" strokeWidth="2">
        {/* X axis (S) */}
        <line
          x1={MARGIN.left}
          y1={HEIGHT - MARGIN.bottom}
          x2={WIDTH - MARGIN.right}
          y2={HEIGHT - MARGIN.bottom}
        />
        {/* Y axis (F) */}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={HEIGHT - MARGIN.bottom}
        />
      </g>

      {/* Axis labels */}
      <g className="axis-labels" fontSize="12" fill="#333">
        {/* S axis ticks and labels */}
        {sTicks.map(s => (
          <g key={`sl-${s}`}>
            <line
              x1={toSvgX(s)}
              y1={HEIGHT - MARGIN.bottom}
              x2={toSvgX(s)}
              y2={HEIGHT - MARGIN.bottom + 5}
              stroke="#333"
            />
            <text
              x={toSvgX(s)}
              y={HEIGHT - MARGIN.bottom + 18}
              textAnchor="middle"
            >
              {s.toFixed(1)}
            </text>
          </g>
        ))}
        {/* F axis ticks and labels */}
        {fTicks.map(f => (
          <g key={`fl-${f}`}>
            <line
              x1={MARGIN.left - 5}
              y1={toSvgY(f)}
              x2={MARGIN.left}
              y2={toSvgY(f)}
              stroke="#333"
            />
            <text
              x={MARGIN.left - 10}
              y={toSvgY(f) + 4}
              textAnchor="end"
            >
              {f.toFixed(1)}
            </text>
          </g>
        ))}
      </g>

      {/* Axis titles */}
      <text
        x={WIDTH / 2}
        y={HEIGHT - 10}
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="#333"
      >
        s
      </text>
      <text
        x={15}
        y={HEIGHT / 2}
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="#333"
        transform={`rotate(-90, 15, ${HEIGHT / 2})`}
      >
        F (spacing)
      </text>

      {/* Clickable plot area for adding knots */}
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={PLOT_WIDTH}
        height={PLOT_HEIGHT}
        fill="transparent"
        onClick={handlePlotClick}
        style={{ cursor: 'crosshair' }}
      />

      {/* Piecewise-linear function line */}
      <path
        d={linePath}
        fill="none"
        stroke="#2196F3"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Output points along s-axis */}
      <OutputPoints si={si} toSvgX={toSvgX} yPosition={HEIGHT - MARGIN.bottom + 25} />

      {/* Draggable knot points */}
      {knots.map((knot, index) => (
        <DraggableKnot
          key={index}
          index={index}
          knot={knot}
          isFirst={index === 0}
          isLast={index === knots.length - 1}
          prevS={index > 0 ? knots[index - 1].S : 0}
          nextS={index < knots.length - 1 ? knots[index + 1].S : 1}
          svgRef={svgRef}
          toSvgX={toSvgX}
          toSvgY={toSvgY}
          toDataS={toDataS}
          toDataF={toDataF}
          fMax={F_MAX}
          onKnotChange={onKnotChange}
          onRemoveKnot={onRemoveKnot}
          canRemove={knots.length > 2}
        />
      ))}
    </svg>
  );
};

export default SSPPlot;
