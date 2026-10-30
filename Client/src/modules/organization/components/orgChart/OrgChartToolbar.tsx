import {
  CompressOutlined,
  ExpandOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Segmented, Space, Tooltip } from "antd";
import {
  LEGEND,
  type BandOption,
} from "@/modules/organization/constants/orgChart";

const BAND_SEGMENTS: { label: string; value: BandOption }[] = [
  { label: "Tự động", value: "auto" },
  { label: "1 dải", value: 1 },
  { label: "2 dải", value: 2 },
  { label: "3 dải", value: 3 },
];

interface OrgChartToolbarProps {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  matchCount: number;
  matchIndex: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  bands: BandOption;
  onBandsChange: (bands: BandOption) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onReload: () => void;
  isLoading: boolean;
}

/** Thanh công cụ: số dải, phóng to / thu nhỏ, tải lại, chú thích màu (ô tìm kiếm đã bỏ, props tìm kiếm chưa dùng). */
export const OrgChartToolbar = ({
  bands,
  onBandsChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onReload,
  isLoading,
}: OrgChartToolbarProps) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
    <Tooltip title="Số dải xếp các Xưởng. Tự động: chọn cách xếp vừa màn hình với chữ to nhất">
      <Segmented<BandOption>
        value={bands}
        onChange={onBandsChange}
        options={BAND_SEGMENTS}
      />
    </Tooltip>

    <Space.Compact>
      <Tooltip title="Thu nhỏ">
        <Button
          aria-label="Thu nhỏ"
          icon={<MinusOutlined />}
          onClick={onZoomOut}
        />
      </Tooltip>
      <Tooltip title="Phóng to">
        <Button
          aria-label="Phóng to"
          icon={<PlusOutlined />}
          onClick={onZoomIn}
        />
      </Tooltip>
      <Tooltip title="Vừa màn hình">
        <Button
          aria-label="Vừa màn hình"
          icon={<CompressOutlined />}
          onClick={onFit}
        />
      </Tooltip>
      <Tooltip title="Kích thước thật (100%)">
        <Button
          aria-label="Kích thước thật"
          icon={<ExpandOutlined />}
          onClick={onReset}
        />
      </Tooltip>
    </Space.Compact>

    <Tooltip title="Tải lại sơ đồ">
      <Button
        aria-label="Tải lại sơ đồ"
        icon={<ReloadOutlined />}
        onClick={onReload}
        loading={isLoading}
      />
    </Tooltip>

    <div className="ml-auto hidden items-center gap-3 xl:flex">
      {LEGEND.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-sm text-text-secondary"
        >
          <span
            className="h-3 w-4 rounded-[2px]"
            style={{
              backgroundColor: item.style.bg,
              border: `1px solid ${item.style.border}`,
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  </div>
);
