import { Card, Empty } from 'antd';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Text,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_HEIGHT, CHART_INK } from '@/modules/incidents/constants/incidentDashboard';

/** 1 lát / 1 cột: tên, số báo cáo, %, màu theo đối tượng, các dòng phụ trong tooltip. */
export interface ChartRow {
  key: string;
  name: string;
  /** Nhãn ngắn trên trục X (bỏ trống = name). */
  shortName?: string;
  count: number;
  percent: number;
  color: string;
  details?: string[];
}

const formatCountLabel = (row: ChartRow) => `${row.count} (${row.percent}%)`;

/** Chữ trong biểu đồ dùng màu chữ, không dùng màu của lát / cột (màu đối tượng nằm ở ô vuông chú thích). */
const TEXT_COLOR = 'var(--app-color-text)';

const renderLegendText = (value: string) => <span style={{ color: TEXT_COLOR }}>{value}</span>;

interface PieLabelProps {
  x?: number;
  y?: number;
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
  payload?: ChartRow;
}

const renderPieLabel = ({ x, y, textAnchor, payload }: PieLabelProps) =>
  payload ? (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fill={TEXT_COLOR}>
      {formatCountLabel(payload)}
    </text>
  ) : null;

interface BarLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: unknown;
}

/** Nhãn đầu cột 1 dòng (LabelList mặc định bẻ dòng theo bề rộng cột). */
const renderBarLabel = ({ x, y, width, value }: BarLabelProps) => (
  <text
    x={Number(x) + Number(width) / 2}
    y={Number(y) - 6}
    textAnchor="middle"
    fontSize={12}
    fill={TEXT_COLOR}
  >
    {String(value ?? '')}
  </text>
);

interface AxisTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
}

/** Tên nhóm trên trục X tự xuống dòng (tối đa ~90px mỗi dòng) để không chồng lên nhau. */
const renderAxisTick = ({ x, y, payload }: AxisTickProps) => (
  <Text
    x={Number(x)}
    y={Number(y) + 4}
    width={90}
    textAnchor="middle"
    verticalAnchor="start"
    fontSize={12}
    fill={CHART_INK.muted}
  >
    {String(payload?.value ?? '')}
  </Text>
);

/** Recharts bọc dòng dữ liệu trong payload (Pie lồng thêm 1 lớp). */
const getRow = (entry?: { payload?: unknown }) => {
  const payload = entry?.payload as (ChartRow & { payload?: ChartRow }) | undefined;
  return payload?.payload ?? payload;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}

const ChartTooltip = ({ active, payload }: ChartTooltipProps) => {
  const row = active ? getRow(payload?.[0]) : undefined;
  if (!row) return null;
  return (
    <div className="max-w-72 rounded-md border border-solid border-border bg-bg-container px-3 py-2 text-sm shadow-md">
      <div className="mb-0.5 flex items-center gap-1.5 font-semibold text-text">
        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.color }} aria-hidden />
        {row.name}
      </div>
      <div className="text-text">
        <b>{row.count}</b> báo cáo ({row.percent}%)
      </div>
      {row.details?.map((detail) => (
        <div key={detail} className="text-text-secondary">
          {detail}
        </div>
      ))}
    </div>
  );
};

interface ChartCardProps {
  title: string;
  rows: ChartRow[];
  emptyText?: string;
}

const ChartCard = ({ title, isEmpty, emptyText, children }: { title: string; isEmpty: boolean; emptyText?: string; children: ReactNode }) => (
  <Card size="small" title={title} className="h-full">
    {isEmpty ? (
      <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText ?? 'Chưa có báo cáo'} />
      </div>
    ) : (
      <div role="img" aria-label={title} style={{ height: CHART_HEIGHT }}>
        {children}
      </div>
    )}
  </Card>
);

/** Biểu đồ tròn (vành khuyên) cho tỉ trọng: nhãn số trên từng lát + chú thích bên dưới. */
export const PieChartCard = ({ title, rows, emptyText }: ChartCardProps) => {
  const visibleRows = rows.filter((row) => row.count > 0);
  return (
    <ChartCard title={title} isEmpty={visibleRows.length === 0} emptyText={emptyText}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={visibleRows}
            dataKey="count"
            nameKey="name"
            innerRadius="45%"
            outerRadius="72%"
            paddingAngle={visibleRows.length > 1 ? 2 : 0}
            // Khe trắng 2px giữa các lát; 1 lát thì bỏ để không có vạch thừa trên vành
            stroke="#ffffff"
            strokeWidth={visibleRows.length > 1 ? 2 : 0}
            label={renderPieLabel}
            labelLine={{ stroke: CHART_INK.axis }}
            isAnimationActive={false}
          >
            {visibleRows.map((row) => (
              <Cell key={row.key} fill={row.color} />
            ))}
          </Pie>
          <Tooltip content={(props) => <ChartTooltip active={props.active} payload={props.payload} />} />
          <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ fontSize: 13 }} formatter={renderLegendText} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/** Biểu đồ cột đứng: mỗi nhóm 1 cột, nhãn số trên đầu cột, tên đầy đủ trong tooltip. */
export const ColumnChartCard = ({ title, rows, emptyText }: ChartCardProps) => (
  <ChartCard title={title} isEmpty={rows.length === 0} emptyText={emptyText}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={rows.map((row) => ({ ...row, axisLabel: row.shortName ?? row.name, valueLabel: formatCountLabel(row) }))}
        margin={{ top: 24, right: 8, left: 0, bottom: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_INK.grid} />
        <XAxis
          dataKey="axisLabel"
          interval={0}
          height={48}
          tick={renderAxisTick}
          axisLine={{ stroke: CHART_INK.axis }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: CHART_INK.muted }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
          content={(props) => <ChartTooltip active={props.active} payload={props.payload} />}
        />
        <Bar dataKey="count" maxBarSize={56} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.key} fill={row.color} />
          ))}
          <LabelList dataKey="valueLabel" content={renderBarLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

interface StatTileProps {
  title: string;
  value: number;
  /** Phần trăm hiện sau số (bỏ trống = không hiện). */
  percent?: number;
  icon?: ReactNode;
}

/** Thẻ chỉ số: tên, con số lớn, % kèm theo. */
export const StatTile = ({ title, value, percent, icon }: StatTileProps) => (
  <Card size="small" className="h-full">
    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
      {icon}
      {title}
    </div>
    <div className="mt-1 text-3xl leading-tight font-semibold text-text">
      {value.toLocaleString('vi-VN')}
      {percent !== undefined && <span className="ml-2 text-base font-normal text-text-secondary">({percent}%)</span>}
    </div>
  </Card>
);
