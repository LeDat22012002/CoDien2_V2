import { memo, useMemo } from 'react';
import { OrgChartBox } from '@/modules/organization/components/orgChart/OrgChartBox';
import type { ChartBox, ChartLayout } from '@/modules/organization/types/orgChart';

const getMarkerId = (color: string) => `org-chart-arrow-${color.replace('#', '')}`;

interface OrgChartCanvasProps {
  layout: ChartLayout;
  /** null = không tìm kiếm. */
  matchIds: Set<string> | null;
  activeId?: string;
  onBoxClick: (box: ChartBox) => void;
}

/** Vẽ sơ đồ đã tính bố cục: đường nối (SVG, nằm dưới) + các ô (div, nằm trên). */
export const OrgChartCanvas = memo(({ layout, matchIds, activeId, onBoxClick }: OrgChartCanvasProps) => {
  const colors = useMemo(() => [...new Set(layout.edges.map((edge) => edge.color))], [layout.edges]);

  return (
    <div className="relative" style={{ width: layout.width, height: layout.height }}>
      <svg
        className="pointer-events-none absolute top-0 left-0"
        width={layout.width}
        height={layout.height}
        aria-hidden
      >
        <defs>
          {colors.map((color) => (
            <marker
              key={color}
              id={getMarkerId(color)}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L10,5 L0,9 z" fill={color} />
            </marker>
          ))}
        </defs>
        {layout.edges.map((edge, index) => (
          <polyline
            // Đường nối không có định danh riêng, thứ tự cố định theo bố cục
            key={index}
            points={edge.points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke={edge.color}
            strokeWidth={1.6}
            strokeLinejoin="miter"
            markerEnd={edge.arrow ? `url(#${getMarkerId(edge.color)})` : undefined}
          />
        ))}
      </svg>

      {layout.boxes.map((box) => (
        <OrgChartBox
          key={box.id}
          box={box}
          isMatched={matchIds?.has(box.id) ?? false}
          isDimmed={matchIds !== null && !matchIds.has(box.id)}
          isActive={activeId === box.id}
          onClick={onBoxClick}
        />
      ))}
    </div>
  );
});
OrgChartCanvas.displayName = 'OrgChartCanvas';
