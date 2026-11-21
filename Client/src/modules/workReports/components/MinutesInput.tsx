import { CalculatorOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Popover,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/shared/utils/format";
import { evaluateExpression } from "@/modules/workReports/utils/calculator";
import { countWorkerValues } from "@/modules/workReports/utils/workReportUtils";

/** Giờ gợi ý cho phím "Số người × giờ × 60" (1 ca hành chính); người dùng sửa được. */
const DEFAULT_HOURS = 8;

/** Số ghi vào biểu thức theo kiểu Việt Nam (dấu phẩy thập phân). */
const toExpressionNumber = (value: number) => String(value).replace(".", ",");

const KEYPAD: string[][] = [
  ["C", "(", ")", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ",", "⌫", "="],
];

interface CalculatorPanelProps {
  /** Số người của dòng đang sửa (cột 8). */
  workerCount: number;
  /** Giá trị đang có trong ô (để tính tiếp). */
  initial: string;
  onApply: (minutes: number) => void;
  onCancel: () => void;
}

/**
 * Máy tính cầm tay của ô giờ công: bàn phím số, + − × ÷, ngoặc; phím nhanh "Số người", "×60",
 * "Số người × giờ × 60" (giờ gợi ý 8, sửa được). Gõ trực tiếp vào màn hình cũng được; Enter = dùng kết quả.
 */
const CalculatorPanel = ({
  workerCount,
  initial,
  onApply,
  onCancel,
}: CalculatorPanelProps) => {
  const [expression, setExpression] = useState(initial);
  const [hours, setHours] = useState<number>(DEFAULT_HOURS);
  const result = evaluateExpression(expression);
  const isEmpty = expression.trim() === "";
  const error = isEmpty
    ? undefined
    : result === undefined
      ? "Phép tính chưa đúng"
      : result < 0
        ? "Kết quả phải ≥ 0"
        : undefined;
  const canApply = !isEmpty && result !== undefined && result >= 0;

  const append = (text: string) => setExpression((current) => current + text);

  const press = (key: string) => {
    if (key === "C") return setExpression("");
    if (key === "⌫") return setExpression((current) => current.slice(0, -1));
    if (key === "=") {
      if (result !== undefined) setExpression(toExpressionNumber(result));
      return;
    }
    append(key);
  };

  const apply = () => {
    if (canApply && result !== undefined) onApply(result);
  };

  return (
    <div className="flex w-64 flex-col gap-2">
      <Input
        aria-label="Phép tính"
        autoFocus
        value={expression}
        onChange={(event) => setExpression(event.target.value)}
        onPressEnter={apply}
        placeholder="vd (2×8×60)÷5"
        status={error ? "error" : undefined}
        className="text-right font-mono"
      />
      <div className="min-h-5 text-right text-sm">
        {error ? (
          <Typography.Text type="danger">{error}</Typography.Text>
        ) : result !== undefined ? (
          <span>
            = <b>{formatNumber(result, 2)}</b> phút
          </span>
        ) : null}
      </div>

      {/* Phím nhanh theo cách các tổ hay tính: số người × số giờ × 60 */}
      <div className="flex flex-wrap items-center gap-1">
        <Tooltip title="Số người thực hiện của dòng (cột 8)">
          <Button size="small" onClick={() => append(String(workerCount))}>
            Số người ({workerCount})
          </Button>
        </Tooltip>
        <Button size="small" onClick={() => append("×60")}>
          ×60
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <InputNumber
          aria-label="Số giờ"
          size="small"
          min={0}
          max={24}
          step={0.5}
          decimalSeparator=","
          value={hours}
          onChange={(value) => setHours(value ?? DEFAULT_HOURS)}
          className="w-16"
        />
        <Button
          size="small"
          className="flex-1"
          onClick={() =>
            append(`${workerCount}×${toExpressionNumber(hours)}×60`)
          }
        >
          Số người × {toExpressionNumber(hours)} giờ × 60
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {KEYPAD.flat().map((key) => (
          <Button
            key={key}
            onClick={() => press(key)}
            type={key === "=" ? "primary" : "default"}
            danger={key === "C"}
            aria-label={
              key === "⌫" ? "Xóa 1 ký tự" : key === "C" ? "Xóa hết" : key
            }
          >
            {key}
          </Button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button size="small" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          size="small"
          type="primary"
          disabled={!canApply}
          onClick={apply}
        >
          Dùng kết quả
        </Button>
      </div>
    </div>
  );
};

/** Ô chứa đúng 1 số phút (không phải "8h" hay chữ khác) thì mới tính lại theo số người. */
const PLAIN_NUMBER = /^\d+(?:[.,]\d+)?$/;

interface MinutesInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onPressEnter?: () => void;
  "aria-label"?: string;
  placeholder?: string;
  /**
   * Ô trống thì giờ công đang hiểu là số này (vd ô Thực tế của dòng lấy từ kế hoạch: trống = giờ KH, ô KH bị khóa):
   * đổi số người thì điền giờ đã tính lại vào ô. Không truyền = ô trống giữ trống.
   */
  emptyBaseMinutes?: number | null;
}

/**
 * Ô giờ công (phút) trong dòng đang sửa: gõ số phút / "8h" như cũ, hoặc bấm biểu tượng máy tính để tính
 * (vd (2×8×60)÷5) rồi "Dùng kết quả" điền số phút vào ô. Chỉ con số cuối cùng được lưu.
 * Liên kết với cột (8) Số người: đổi số người thì giờ công trong ô tự nhân theo tỉ lệ người mới / người cũ
 * (giữ nguyên giờ của mỗi người, vd 2 người 192 phút → 3 người 288 phút) và báo cho người nhập biết.
 * Ô "8h" không cần: lúc lưu đã tính theo số người hiện tại.
 * Dùng trong Form.Item của form dòng (đọc số người từ trường "workers").
 */
export const MinutesInput = ({
  value,
  onChange,
  onPressEnter,
  placeholder = "phút / 8h",
  emptyBaseMinutes,
  ...rest
}: MinutesInputProps) => {
  const { message } = App.useApp();
  const form = Form.useFormInstance();
  const workers = Form.useWatch<string[] | undefined>("workers", form);
  const workerCount = countWorkerValues(workers);
  const [open, setOpen] = useState(false);

  // Giá trị mới nhất cho hiệu ứng tính lại (không chạy lại hiệu ứng mỗi lần gõ)
  const latestRef = useRef({
    value,
    onChange,
    emptyBaseMinutes,
    label: rest["aria-label"],
  });
  latestRef.current = {
    value,
    onChange,
    emptyBaseMinutes,
    label: rest["aria-label"],
  };
  /** Số người lần gần nhất > 0 (bỏ hết người rồi chọn lại vẫn tính theo số người trước đó). */
  const lastCountRef = useRef(0);

  useEffect(() => {
    const previous = lastCountRef.current;
    if (workerCount > 0) lastCountRef.current = workerCount;
    // Lần đầu có số người (mở dòng để sửa) hoặc đang bỏ trống người: chỉ ghi nhận
    if (previous <= 0 || workerCount <= 0 || previous === workerCount) return;

    const {
      value: text,
      onChange: change,
      emptyBaseMinutes: base,
      label,
    } = latestRef.current;
    const trimmed = text?.trim() ?? "";
    const current =
      trimmed === ""
        ? base
        : PLAIN_NUMBER.test(trimmed)
          ? Number(trimmed.replace(",", "."))
          : undefined;
    if (current === undefined || current === null || current <= 0) return;

    const scaled = Math.round((current / previous) * workerCount * 100) / 100;
    change?.(String(scaled));
    message.info(
      `${label ?? "Giờ công"}: tính lại theo ${workerCount} người, ${formatNumber(current, 2)} → ${formatNumber(scaled, 2)} phút`,
    );
  }, [workerCount, message]);

  return (
    <Input
      aria-label={rest["aria-label"]}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      onPressEnter={onPressEnter}
      placeholder={placeholder}
      className="text-right"
      suffix={
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          placement="bottomRight"
          destroyOnHidden
          content={
            <CalculatorPanel
              workerCount={workerCount}
              // Ô đang có số / phép tính đọc được thì tính tiếp, còn lại (vd "8h") bắt đầu từ trống
              initial={
                value && evaluateExpression(value) !== undefined
                  ? value.trim()
                  : ""
              }
              onApply={(minutes) => {
                onChange?.(String(minutes));
                setOpen(false);
              }}
              onCancel={() => setOpen(false)}
            />
          }
        >
          <Tooltip title="Máy tính">
            <CalculatorOutlined
              role="button"
              aria-label="Mở máy tính"
              className="cursor-pointer text-text-secondary hover:text-primary"
            />
          </Tooltip>
        </Popover>
      }
    />
  );
};
