import { Card, Empty } from "antd";
import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
/** Nền thẻ: khe giữa các đoạn cột chồng / lát của biểu đồ tròn. */
const SURFACE_COLOR = "var(--app-color-bg-container)";

/** 1 dãy số liệu (cột / đoạn cột chồng): khóa dữ liệu, tên trên chú thích, màu theo đối tượng. */
export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

/** 1 nhóm (1 xưởng) trên trục danh mục: nhãn ngắn, tên đầy đủ, giá trị theo khóa dãy số liệu. */
export interface ChartGroup {
  key: string;
  label: string;
  fullName: string;
  values: Record<string, number>;
  /** Dòng phụ trong tooltip (vd % thực hiện). */
  details?: string[];
}

/** Chiều rộng trục tên xưởng (biểu đồ thanh ngang; tên viết tắt LG1, NĐ2, XLN-T110kV…). */
const CATEGORY_AXIS_WIDTH = 76;
/** Chiều cao 1 xưởng trên biểu đồ thanh ngang: đủ chỗ cho thanh chồng + khe. */
const ROW_HEIGHT = 48;
/** Trục số + chú thích + lề của biểu đồ cột ngang. */
const CHART_CHROME_HEIGHT = 84;

/**
 * Chiều cao chung cho hàng biểu đồ theo số xưởng (các thẻ trong 1 hàng cao bằng nhau,
 * xưởng ở cùng độ cao trên mọi biểu đồ cột ngang).
 */
export const dashboardChartHeight = (groupCount: number) =>
  Math.max(CHART_HEIGHT, groupCount * ROW_HEIGHT + CHART_CHROME_HEIGHT);

interface AxisTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
}

/** Tên xưởng dưới cột dọc tự xuống dòng để không chồng nhau (thẻ hẹp khi 4 biểu đồ 1 hàng). */
const renderColumnAxisTick = ({ x, y, payload }: AxisTickProps) => (
  <Text
    x={Number(x)}
    y={Number(y) + 4}
    width={64}
    textAnchor="middle"
    verticalAnchor="start"
    fontSize={11}
    fill={CHART_INK.muted}
  >
    {String(payload?.value ?? "")}
  </Text>
);

const renderLegendText = (value: string) => (
  <span style={{ color: TEXT_COLOR }}>{value}</span>
);

/** Khung tooltip chung: tên đầy đủ + các dòng (ô màu + tên + giá trị) + dòng phụ. */
const TooltipBox = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="max-w-64 rounded border border-solid border-border bg-bg-container px-2 py-1 text-xs leading-5 shadow-md">
    <div className="font-semibold text-text">{title}</div>
    {children}
  </div>
);

const Swatch = ({ color }: { color: string }) => (
  <span
    className="size-2 shrink-0 rounded-sm"
    style={{ backgroundColor: color }}
    aria-hidden
  />
);

interface GroupTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
  series: ChartSeries[];
  unit: string;
  /** Hiện % của từng dãy trong tổng nhóm (cột chồng). */
  showShare?: boolean;
  /** Cột chồng: chỉ hiện đoạn (đầu mục) đang rê chuột; trống = mọi dãy. */
  activeKey?: string;
}

/** Tooltip của 1 xưởng: mọi dãy số liệu (ô màu + tên + giá trị), dòng phụ. */
const GroupTooltip = ({
  active,
  payload,
  series,
  unit,
  showShare,
  activeKey,
}: GroupTooltipProps) => {
  const row = active
    ? (payload?.[0]?.payload as
        | (ChartGroup & Record<string, number>)
        | undefined)
    : undefined;
  if (!row) return null;
  const total = series.reduce(
    (sum, item) => sum + (row.values[item.key] ?? 0),
    0,
  );
  // Cột cạnh nhau (KH – TT): hiện cả dãy = 0 để thấy "TT 0";
  // cột chồng: đoạn đang rê chuột (chưa xác định đoạn thì mọi đầu mục có số liệu)
  const hovered = activeKey
    ? series.filter((item) => item.key === activeKey)
    : [];
  const visible =
    hovered.length > 0
      ? hovered
      : showShare
        ? series.filter((item) => (row.values[item.key] ?? 0) > 0)
        : series;
  return (
    <TooltipBox title={row.fullName}>
      {visible.length === 0 && (
        <div className="text-text-secondary">Chưa có số liệu</div>
      )}
      {visible.map((item) => {
        const value = row.values[item.key] ?? 0;
        return (
          <div key={item.key} className="flex items-center gap-1.5 text-text">
            <Swatch color={item.color} />
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
    </TooltipBox>
  );
};

const EmptyChart = ({ height, text }: { height: number; text?: string }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={text ?? "Chưa có số liệu"}
    />
  </div>
);

interface GroupBarChartCardProps {
  title: string;
  groups: ChartGroup[];
  series: ChartSeries[];
  /** Đơn vị giá trị trong tooltip, vd "phút", "mã". */
  unit: string;
  /** true = cột chồng (tỉ trọng theo đầu mục); false = cột cạnh nhau (KH vs TT). */
  stacked?: boolean;
  /** "column" = cột dọc (trục ngang = xưởng); "bar" = thanh ngang (trục dọc = xưởng). */
  direction?: "column" | "bar";
  /** Chiều cao vùng vẽ (dùng chung cả hàng để các thẻ cao bằng nhau). */
  height?: number;
  extra?: ReactNode;
  emptyText?: string;
}

/**
 * Biểu đồ cột theo xưởng, 1 trục số: cột dọc (direction "column") hoặc thanh ngang ("bar");
 * cột cạnh nhau (so sánh dãy) hoặc cột chồng (tỉ trọng). Cột mảnh; ≥ 2 dãy có chú thích; 1 dãy thì tiêu đề gọi tên.
 * Khe 2px (màu nền) giữa các đoạn / cột; đầu cột vuông. Cột chồng: tooltip chỉ hiện đoạn (đầu mục) đang rê chuột.
 */
export const GroupBarChartCard = ({
  title,
  groups,
  series,
  unit,
  stacked = false,
  direction = "bar",
  height = dashboardChartHeight(groups.length),
  extra,
  emptyText,
}: GroupBarChartCardProps) => {
  const isEmpty = groups.every((group) =>
    series.every((item) => !group.values[item.key]),
  );
  const data = groups.map((group) => ({ ...group, ...group.values }));
  const isColumn = direction === "column";
  /** Cột chồng: đoạn (dãy) đang rê chuột để tooltip chỉ hiện đầu mục đó. */
  const [hoveredKey, setHoveredKey] = useState<string>();
  const valueAxisProps = {
    type: "number" as const,
    allowDecimals: false,
    tick: { fontSize: 11, fill: CHART_INK.muted },
    tickFormatter: (value: number) => formatNumber(value),
    axisLine: false,
    tickLine: false,
  };
  const categoryAxisProps = {
    type: "category" as const,
    dataKey: "label",
    interval: 0,
    axisLine: { stroke: CHART_INK.axis },
    tickLine: false,
  };
  return (
    <Card size="small" title={title} extra={extra} className="h-full">
      {isEmpty ? (
        <EmptyChart height={height} text={emptyText} />
      ) : (
        <div
          role="img"
          aria-label={title}
          style={{ height }}
          className="[&_:focus:not(:focus-visible)]:outline-none"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={isColumn ? "horizontal" : "vertical"}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              barCategoryGap="24%"
              barGap={2}
              onMouseLeave={() => setHoveredKey(undefined)}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={isColumn}
                vertical={!isColumn}
                stroke={CHART_INK.grid}
              />
              {isColumn ? (
                <>
                  <XAxis
                    {...categoryAxisProps}
                    height={44}
                    tick={renderColumnAxisTick}
                  />
                  <YAxis {...valueAxisProps} width={48} />
                </>
              ) : (
                <>
                  <XAxis {...valueAxisProps} />
                  <YAxis
                    {...categoryAxisProps}
                    width={CATEGORY_AXIS_WIDTH}
                    tick={{ fontSize: 12, fill: CHART_INK.muted }}
                  />
                </>
              )}
              <Tooltip
                // Cột chồng: tooltip theo từng đoạn, không tô nền cả hàng
                shared={!stacked}
                cursor={stacked ? false : { fill: "rgba(0,0,0,0.04)" }}
                content={(props) => (
                  <GroupTooltip
                    active={props.active}
                    payload={props.payload}
                    series={series}
                    unit={unit}
                    showShare={stacked}
                    activeKey={stacked ? hoveredKey : undefined}
                  />
                )}
              />
              {series.length > 1 && (
                <Legend
                  verticalAlign="bottom"
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={renderLegendText}
                />
              )}
              {series.map((item) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.name}
                  fill={item.color}
                  stackId={stacked ? "total" : undefined}
                  // Cột mảnh: cạnh nhau 14px (dọc) / 12px (ngang), cột chồng 16px
                  // Cột vuông đầu (không bo góc); cạnh nhau 18px (dọc) / 16px (ngang), cột chồng 22px
                  maxBarSize={stacked ? 22 : isColumn ? 18 : 16}
                  onMouseEnter={
                    stacked ? () => setHoveredKey(item.key) : undefined
                  }
                  stroke={stacked ? SURFACE_COLOR : undefined}
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

/** 1 lát của biểu đồ tròn: 1 xưởng. */
export interface ShareSlice {
  key: string;
  label: string;
  fullName: string;
  value: number;
  color: string;
}

interface SharePieChartCardProps {
  title: string;
  slices: ShareSlice[];
  /** Đơn vị giá trị, vd "phút". */
  unit: string;
  height?: number;
  emptyText?: string;
}

const RADIAN = Math.PI / 180;

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
}

/** Nhãn % ngay ngoài lát, chữ màu chữ (không dùng màu lát); lát < 4% bỏ nhãn, xem ở tooltip. */
const renderPieLabel = ({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  percent = 0,
}: PieLabelProps) => {
  if (percent < 0.04) return null;
  const radius = outerRadius + 12;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill={TEXT_COLOR}
      fontSize={12}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {formatNumber(percent * 100, 1)}%
    </text>
  );
};

/**
 * Biểu đồ tròn (vành khuyên) tỉ trọng của từng xưởng trong tổng nhà máy: lát có khe 2px màu nền, nhãn % ngay ngoài lát,
 * tổng ở góc thẻ; chú thích ghi tên xưởng nên không chỉ dựa vào màu. Tooltip: phút + % cả nhà máy.
 */
export const SharePieChartCard = ({
  title,
  slices,
  unit,
  height = CHART_HEIGHT,
  emptyText,
}: SharePieChartCardProps) => {
  const visible = slices.filter((slice) => slice.value > 0);
  const total = visible.reduce((sum, slice) => sum + slice.value, 0);
  const percentOf = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  return (
    <Card
      size="small"
      title={title}
      extra={
        total > 0 ? (
          <span className="text-text-secondary">
            Tổng <b className="text-text">{formatNumber(total, 0)}</b> {unit}
          </span>
        ) : undefined
      }
      className="h-full"
    >
      {total === 0 ? (
        <EmptyChart height={height} text={emptyText} />
      ) : (
        <div
          role="img"
          aria-label={title}
          style={{ height }}
          className="[&_:focus:not(:focus-visible)]:outline-none"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="label"
                innerRadius="45%"
                outerRadius="70%"
                startAngle={90}
                endAngle={-270}
                stroke={SURFACE_COLOR}
                strokeWidth={2}
                labelLine={false}
                label={renderPieLabel}
                isAnimationActive={false}
              >
                {visible.map((slice) => (
                  <Cell key={slice.key} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                content={(props) => {
                  const slice = props.active
                    ? (props.payload?.[0]?.payload as ShareSlice | undefined)
                    : undefined;
                  if (!slice) return null;
                  return (
                    <TooltipBox title={slice.fullName}>
                      <div className="flex items-center gap-1.5 text-text">
                        <Swatch color={slice.color} />
                        <b>{formatNumber(slice.value, 0)}</b> {unit}
                        <span className="text-text-secondary">
                          ({formatNumber(percentOf(slice.value), 1)}% cả nhà
                          máy)
                        </span>
                      </div>
                    </TooltipBox>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12 }}
                formatter={renderLegendText}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
