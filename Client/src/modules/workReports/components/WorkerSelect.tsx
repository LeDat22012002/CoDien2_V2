import { Select, Typography } from "antd";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { WHOLE_UNIT_LABEL } from "@/modules/workReports/constants/workReportOptions";
import { useWorkerOptions } from "@/modules/workReports/hooks/useWorkReportQueries";
import type { WorkItemWorker } from "@/modules/workReports/types/workReports";
import {
  EMPLOYEE_PREFIX,
  isWholeUnitValue,
  toWholeUnitValue,
  toWorkerValue,
} from "@/modules/workReports/utils/workReportUtils";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * TẠM TẮT gợi ý nhân viên (danh sách nhân viên chưa đủ): chỉ gõ tên rồi Enter. Không gọi API gợi ý,
 * popup chỉ hiện đúng tên đang gõ để Enter thêm vào. Bật lại: đổi thành true.
 */
const IS_SUGGESTION_ENABLED = true;

interface WorkerSelectProps {
  unitId: number;
  value?: string[];
  onChange?: (value: string[]) => void;
  /** Người đang có trên dòng (để hiện đúng tên khi chưa tìm). */
  initialWorkers?: WorkItemWorker[];
  ariaLabel?: string;
}

interface WorkerOption {
  value: string;
  /** Hiện trên ô đã chọn: chỉ tên. */
  label: string;
  /** Dòng phụ trong danh sách: mã NV / số người của tổ. */
  hint?: string;
  /** Chuỗi tìm (bỏ dấu): tên + mã NV. */
  search: string;
}

/** Bỏ dấu + chữ thường để tìm tên tiếng Việt. */
const toSearchKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

/** Tên ngắn trên ô đã chọn: 2 chữ cuối, "Nguyễn Tấn Lộc Ninh" → "Lộc Ninh". */
const toShortName = (fullName: string) =>
  fullName.trim().split(/\s+/).slice(-2).join(" ");

/**
 * Chọn người thực hiện: "Cả tổ" (số người = số nhân viên tổ/kíp trên sơ đồ), nhân viên của tổ/kíp, hoặc gõ tên tự do
 * rồi Enter. Chọn "Cả tổ" thì bỏ người lẻ và ngược lại. Ô đã chọn chỉ hiện tên, hiện đủ (không gộp "+n").
 */
export const WorkerSelect = ({
  unitId,
  value,
  onChange,
  initialWorkers = [],
  ariaLabel,
}: WorkerSelectProps) => {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(
    keyword.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const suggestionUnitId = IS_SUGGESTION_ENABLED ? unitId : undefined;
  // Cả tổ/kíp (không lọc): đếm số người cho "Cả tổ"
  const membersQuery = useWorkerOptions(suggestionUnitId, "UNIT", "");
  const optionsQuery = useWorkerOptions(
    suggestionUnitId,
    "UNIT",
    debouncedKeyword,
  );
  const memberCount = membersQuery.isPlaceholderData
    ? 0
    : (membersQuery.data?.length ?? 0);

  const options = useMemo(() => {
    const known = new Map<string, WorkerOption>();
    if (memberCount > 0) {
      const wholeUnitValue = toWholeUnitValue(memberCount);
      known.set(wholeUnitValue, {
        value: wholeUnitValue,
        label: WHOLE_UNIT_LABEL,
        hint: `${memberCount} người`,
        search: toSearchKey(`${WHOLE_UNIT_LABEL} ca to`),
      });
    }
    // "Cả tổ" đã lưu với số người cũ: vẫn hiện chữ "Cả tổ"
    value?.filter(isWholeUnitValue).forEach((wholeUnitValue) => {
      if (!known.has(wholeUnitValue)) {
        known.set(wholeUnitValue, {
          value: wholeUnitValue,
          label: WHOLE_UNIT_LABEL,
          search: toSearchKey(WHOLE_UNIT_LABEL),
        });
      }
    });
    initialWorkers.forEach((worker) =>
      known.set(toWorkerValue(worker), {
        value: toWorkerValue(worker),
        label: worker.displayName,
        hint: worker.empCode ?? undefined,
        search: toSearchKey(`${worker.displayName} ${worker.empCode ?? ""}`),
      }),
    );
    (optionsQuery.data ?? []).forEach((option) =>
      known.set(`${EMPLOYEE_PREFIX}${option.employeeId}`, {
        value: `${EMPLOYEE_PREFIX}${option.employeeId}`,
        label: option.fullName,
        hint: option.empCode,
        search: toSearchKey(`${option.fullName} ${option.empCode}`),
      }),
    );
    return [...known.values()];
  }, [initialWorkers, optionsQuery.data, memberCount, value]);

  const handleChange = (next: string[]) => {
    const hadWholeUnit = value?.some(isWholeUnitValue) ?? false;
    const wholeUnit = next.filter(isWholeUnitValue);
    let result = next;
    if (!hadWholeUnit && wholeUnit.length > 0) {
      // Vừa chọn "Cả tổ": bỏ người lẻ
      result = [wholeUnit[wholeUnit.length - 1]];
    } else if (hadWholeUnit && next.length > wholeUnit.length) {
      // Đang "Cả tổ" mà chọn / gõ thêm người: bỏ "Cả tổ"
      result = next.filter((item) => !isWholeUnitValue(item));
    }
    onChange?.(result);
    setKeyword("");
  };

  return (
    <Select<string[], WorkerOption>
      mode="tags"
      value={value}
      onChange={handleChange}
      searchValue={keyword}
      onSearch={setKeyword}
      options={options}
      filterOption={
        IS_SUGGESTION_ENABLED
          ? (input, option) =>
              // Tên gõ tự do (tag do antd tạo) không có search: tìm theo nhãn / giá trị
              (
                option?.search ??
                toSearchKey(String(option?.label ?? option?.value ?? ""))
              ).includes(toSearchKey(input.trim()))
          : () => false
      }
      // Đã chọn: chỉ tên, nối bằng dấu phẩy, hết chỗ mới xuống dòng (bỏ chọn: bấm lại trong danh sách / Backspace)
      tagRender={({ label, value: itemValue }) => {
        const fullName = typeof label === "string" ? label : String(itemValue);
        return (
          <span className="me-1 leading-6" title={fullName}>
            {toShortName(fullName)}
            {value && itemValue !== value[value.length - 1] ? "," : ""}
          </span>
        );
      }}
      // Danh sách: "Họ tên (Mã NV)", "Cả tổ (n người)"; dài thì xuống dòng
      optionRender={(option) => (
        <span
          className={`whitespace-normal ${
            isWholeUnitValue(String(option.value)) ? "font-semibold" : ""
          }`}
        >
          {option.data.label}
          {option.data.hint && ` (${option.data.hint})`}
        </span>
      )}
      // Tắt gợi ý: popup chỉ mở khi đang gõ và chỉ có đúng tên đang gõ (Enter để thêm)
      open={IS_SUGGESTION_ENABLED ? undefined : keyword.trim().length > 0}
      notFoundContent={IS_SUGGESTION_ENABLED ? undefined : null}
      suffixIcon={IS_SUGGESTION_ENABLED ? undefined : null}
      tokenSeparators={[",", ";"]}
      placeholder={
        IS_SUGGESTION_ENABLED ? "Chọn hoặc gõ tên" : "Gõ tên rồi nhấn Enter"
      }
      aria-label={ariaLabel ?? "Người thực hiện"}
      loading={optionsQuery.isFetching}
      className="w-full"
      popupRender={
        IS_SUGGESTION_ENABLED
          ? (menu) => (
              <div>
                {menu}
                <Typography.Text
                  type="secondary"
                  className="block px-2 pt-2 text-sm"
                >
                  Không có trong danh sách: gõ tên rồi nhấn Enter.
                </Typography.Text>
              </div>
            )
          : undefined
      }
    />
  );
};
