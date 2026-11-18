import { Card, Empty } from "antd";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Text,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/shared/utils/format";
import {
  CHART_HEIGHT,
  CHART_INK,
} from "@/modules/incidents/constants/incidentDashboard";

/** Chữ trong biểu đồ dùng màu chữ, không dùng màu của cột. */
const TEXT_COLOR = "var(--app-color-text)";

/** 1 dãy số liệu (cột / đoạn cột chồng): khóa dữ liệu, tên trên chú thích, màu theo đối tượng. */
export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

/** 1 nhóm trên trục X (1 xưởng): nhãn ngắn, tên đầy đủ, giá trị theo khóa dãy số liệu. */
export interface ChartGroup {
  key: string;
  label: string;
  fullName: string;
  values: Record<string, number>;
  /** Dòng phụ trong tooltip (vd % thực hiện). */
  details?: string[];
}

interface AxisTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
}

/** Tên xưởng trên trục X tự xuống dòng để không chồng nhau. */
const renderAxisTick = ({ x, y, payload }: AxisTickProps) => (
  <Text
    x={Number(x)}
    y={Number(y) + 4}
    width={100}
    textAnchor="middle"
    verticalAnchor="start"
    fontSize={12}
    fill={CHART_INK.muted}
  >
    {String(payload?.value ?? "")}
  </Text>
);

const renderLegendText = (value: string) => (
  <span style={{ color: TEXT_COLOR }}>{value}</span>
);

interface GroupTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  series: ChartSeries[];
  unit: string;
  /** Hiện % của từng dãy trong tổng nhóm (cột chồng). */
  showShare?: boolean;
}

/** Tooltip của 1 xưởng: mọi dãy số liệu (ô màu + tên + giá trị), dòng phụ. */
const GroupTooltip = ({
  active,
  payload,
  series,
  unit,
  showShare,
}: GroupTooltipProps) => {
  const row = active
    ? (payload?.[0]?.payload as (ChartGroup & Record<string, number>) | undefined)
    : undefined;
  if (!row) return null;
  const total = series.reduce((sum, item) => sum + (row.values[item.key] ?? 0), 0);
  const visible = series.filter((item) => (row.values[item.key] ?? 0) > 0);
  return (
    <div className="max-w-80 rounded-md border border-solid border-border bg-bg-container px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-semibold text-text">{row.fullName}</div>
      {visible.length === 0 && (
        <div className="text-text-secondary">Chưa có số liệu</div>
      )}
      {visible.map((item) => {
        const value = row.values[item.key] ?? 0;
        return (
          <div key={item.key} className="flex items-center gap-1.5 text-text">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">{item.name}</span>
            <b>{formatNumber(value, 0)}</b> {unit}
            {showShare && total > 0 && (
              <span className="text-text-secondary">
                ({formatNumber((value / total) * 100, 1)}%)
              </span>
            )}
          </div>
        );
      })}
      {row.details?.map((detail) => (
        <div key={detail} className="text-text-secondary">
          {detail}
        </div>
      ))}
    </div>
  );
};

interface GroupBarChartCardProps {
  title: string;
  groups: ChartGroup[];
  series: ChartSeries[];
  /** Đơn vị giá trị trong tooltip, vd "phút", "mã". */
  unit: string;
  /** true = cột chồng (tỉ trọng theo đầu mục); false = cột cạnh nhau (KH vs TT). */
  stacked?: boolean;
  extra?: ReactNode;
  emptyText?: string;
}

/**
 * Biểu đồ cột theo xưởng, 1 trục: cột cạnh nhau (so sánh dãy) hoặc cột chồng (tỉ trọng).
 * ≥ 2 dãy có chú thích; 1 dãy thì tiêu đề gọi tên, không chú thích. Khe 2px giữa các đoạn / cột.
 */
export const GroupBarChartCard = ({
  title,
  groups,
  series,
  unit,
  stacked = false,
  extra,
  emptyText,
}: GroupBarChartCardProps) => {
  const isEmpty = groups.every((group) =>
    series.every((item) => !group.values[item.key]),
  );
  const data = groups.map((group) => ({ ...group, ...group.values }));
  return (
    <Card size="small" title={title} extra={extra} className="h-full">
      {isEmpty ? (
        <div
          className="flex items-center justify-center"
          style={{ height: CHART_HEIGHT }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={emptyText ?? "Chưa có số liệu"}
          />
        </div>
      ) : (
        <div
          role="img"
          aria-label={title}
          style={{ height: CHART_HEIGHT }}
          className="[&_:focus:not(:focus-visible)]:outline-none"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="24%"
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={CHART_INK.grid}
              />
              <XAxis
                dataKey="label"
                interval={0}
                height={48}
                tick={renderAxisTick}
                axisLine={{ stroke: CHART_INK.axis }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: CHART_INK.muted }}
                tickFormatter={(value: number) => formatNumber(value)}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={(props) => (
                  <GroupTooltip
                    active={props.active}
                    payload={props.payload}
                    series={series}
                    unit={unit}
                    showShare={stacked}
                  />
                )}
              />
              {series.length > 1 && (
                <Legend
                  verticalAlign="bottom"
                  iconType="square"
                  wrapperStyle={{ fontSize: 13 }}
                  formatter={renderLegendText}
                />
              )}
              {series.map((item, index) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.name}
                  fill={item.color}
                  stackId={stacked ? "total" : undefined}
                  maxBarSize={stacked ? 64 : 40}
                  // Cột chồng: chỉ bo góc đoạn trên cùng; khe trắng 2px giữa các đoạn
                  radius={
                    !stacked || index === series.length - 1
                      ? [4, 4, 0, 0]
                      : undefined
                  }
                  stroke={stacked ? "#ffffff" : undefined}
                  strokeWidth={stacked ? 2 : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
