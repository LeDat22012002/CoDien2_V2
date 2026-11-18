import { Select, Typography } from "antd";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { WHOLE_UNIT_LABEL } from "@/modules/workReports/constants/workReportOptions";
import { useWorkerOptions } from "@/modules/workReports/hooks/useWorkReportQueries";
import type {
  OrgUnitOption,
  WorkItemWorker,
  WorkerOption as WorkerOptionDto,
} from "@/modules/workReports/types/workReports";
import {
  EMPLOYEE_PREFIX,
  isWholeGroupValue,
  isWholeUnitValue,
  isWholeValue,
  parseWholeGroupValue,
  toShortName,
  toWholeGroupValue,
  toWholeUnitValue,
  toWorkerValue,
  wholeGroupLabel,
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
  /** Tổ "Cả tổ" đã lưu của dòng (để hiện đúng tên tổ). */
  initialGroups?: OrgUnitOption[];
  ariaLabel?: string;
}

interface WorkerOption {
  value: string;
  /** Hiện trên ô đã chọn: tên người / "Cả tổ …". */
  label: string;
  /** Dòng phụ trong danh sách: mã NV / số người của tổ. */
  hint?: string;
  /** Chuỗi tìm (bỏ dấu): tên + mã NV. */
  search: string;
}

/** Nhóm theo tổ gợi ý (tiêu đề tổ + "Cả tổ" của tổ + nhân viên tổ). */
interface WorkerOptionGroup {
  label: string;
  title: string;
  options: WorkerOption[];
}

/** Bỏ dấu + chữ thường để tìm tên tiếng Việt. */
const toSearchKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const toPersonOption = (option: WorkerOptionDto): WorkerOption => ({
  value: `${EMPLOYEE_PREFIX}${option.employeeId}`,
  label: option.fullName,
  hint: option.empCode,
  search: toSearchKey(`${option.fullName} ${option.empCode}`),
});

/**
 * Chọn người thực hiện: nhân viên của tổ/kíp, "Cả tổ", hoặc gõ tên tự do rồi Enter.
 * - Đơn vị thường: 1 dòng "Cả tổ" (số người = số nhân viên tổ/kíp trên sơ đồ) + danh sách nhân viên.
 * - Đơn vị có tổ gợi ý (vd sheet Lọc bụi gồm tổ Lò cao 1, 2 và tổ Lò cao 3, 4): chia nhóm theo từng tổ, mỗi tổ có
 *   "Cả tổ" riêng (chọn được nhiều tổ).
 * Chọn "Cả tổ" thì bỏ người lẻ và ngược lại. Ô đã chọn chỉ hiện tên, hiện đủ (không gộp "+n").
 */
export const WorkerSelect = ({
  unitId,
  value,
  onChange,
  initialWorkers = [],
  initialGroups = [],
  ariaLabel,
}: WorkerSelectProps) => {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(
    keyword.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const suggestionUnitId = IS_SUGGESTION_ENABLED ? unitId : undefined;
  // Cả tổ/kíp (không lọc): đếm số người cho "Cả tổ" và chia tổ
  const membersQuery = useWorkerOptions(suggestionUnitId, "UNIT", "");
  const optionsQuery = useWorkerOptions(
    suggestionUnitId,
    "UNIT",
    debouncedKeyword,
  );
  const members = useMemo(
    () => (membersQuery.isPlaceholderData ? [] : (membersQuery.data ?? [])),
    [membersQuery.isPlaceholderData, membersQuery.data],
  );

  const options = useMemo(() => {
    const selected = value ?? [];
    const used = new Set<string>();
    const take = (option: WorkerOption) => {
      used.add(option.value);
      return option;
    };

    // Tổ gợi ý theo thứ tự Server trả (thứ tự đã cấu hình), kèm số người
    const groups = new Map<number, { name: string; count: number }>();
    members.forEach((member) => {
      if (member.groupOrgUnitId == null) return;
      const group = groups.get(member.groupOrgUnitId);
      if (group) group.count += 1;
      else
        groups.set(member.groupOrgUnitId, {
          name: member.groupName ?? "",
          count: 1,
        });
    });

    const result: (WorkerOption | WorkerOptionGroup)[] = [];
    if (groups.size > 0) {
      const found = optionsQuery.data ?? [];
      groups.forEach((group, orgUnitId) => {
        // Đang chọn "Cả tổ" của tổ này (số người cũ): dùng đúng giá trị đó để không hiện trùng
        const wholeValue =
          selected.find(
            (item) =>
              isWholeGroupValue(item) &&
              parseWholeGroupValue(item).orgUnitId === orgUnitId,
          ) ?? toWholeGroupValue(orgUnitId, group.count);
        const label = wholeGroupLabel(group.name);
        result.push({
          label: group.name,
          title: group.name,
          options: [
            take({
              value: wholeValue,
              label,
              hint: `${group.count} người`,
              search: toSearchKey(`${label} ca to ${group.name}`),
            }),
            ...found
              .filter((member) => member.groupOrgUnitId === orgUnitId)
              .map((member) => take(toPersonOption(member))),
          ],
        });
      });
    } else if (members.length > 0) {
      const wholeUnitValue =
        selected.find(isWholeUnitValue) ?? toWholeUnitValue(members.length);
      result.push(
        take({
          value: wholeUnitValue,
          label: WHOLE_UNIT_LABEL,
          hint: `${members.length} người`,
          search: toSearchKey(`${WHOLE_UNIT_LABEL} ca to`),
        }),
      );
      (optionsQuery.data ?? []).forEach((member) =>
        result.push(take(toPersonOption(member))),
      );
    }

    // Giá trị đang chọn chưa có trong danh sách (chưa tải xong / tổ đã bỏ / người ngoài tổ): vẫn hiện đúng tên
    selected.filter(isWholeValue).forEach((item) => {
      if (used.has(item)) return;
      const group = isWholeGroupValue(item)
        ? initialGroups.find(
            (candidate) =>
              candidate.orgUnitId === parseWholeGroupValue(item).orgUnitId,
          )
        : undefined;
      const label = isWholeUnitValue(item)
        ? WHOLE_UNIT_LABEL
        : group
          ? wholeGroupLabel(group.name)
          : "Cả tổ";
      result.push(take({ value: item, label, search: toSearchKey(label) }));
    });
    initialWorkers.forEach((worker) => {
      const workerValue = toWorkerValue(worker);
      if (used.has(workerValue)) return;
      result.push(
        take({
          value: workerValue,
          label: worker.displayName,
          hint: worker.empCode ?? undefined,
          search: toSearchKey(`${worker.displayName} ${worker.empCode ?? ""}`),
        }),
      );
    });
    return result;
  }, [members, optionsQuery.data, value, initialWorkers, initialGroups]);

  const handleChange = (next: string[]) => {
    const previous = value ?? [];
    const added = next.filter((item) => !previous.includes(item));
    const addedWhole = added.filter(isWholeValue);
    let result = next;
    if (addedWhole.length > 0) {
      const last = addedWhole[addedWhole.length - 1];
      if (isWholeUnitValue(last)) {
        // Vừa chọn "Cả tổ" (cả đơn vị): bỏ hết người lẻ
        result = [last];
      } else {
        // Vừa chọn "Cả tổ" của 1 tổ: bỏ người lẻ, giữ "Cả tổ" của các tổ khác
        const { orgUnitId } = parseWholeGroupValue(last);
        result = next.filter(
          (item) =>
            isWholeGroupValue(item) &&
            (item === last || parseWholeGroupValue(item).orgUnitId !== orgUnitId),
        );
      }
    } else if (added.length > 0 && previous.some(isWholeValue)) {
      // Đang "Cả tổ" mà chọn / gõ thêm người: bỏ "Cả tổ"
      result = next.filter((item) => !isWholeValue(item));
    }
    onChange?.(result);
    setKeyword("");
  };

  return (
    <Select<string[], WorkerOption | WorkerOptionGroup>
      mode="tags"
      value={value}
      onChange={handleChange}
      searchValue={keyword}
      onSearch={setKeyword}
      options={options}
      filterOption={
        IS_SUGGESTION_ENABLED
          ? (input, option) => {
              if (!option || "options" in option) return false;
              // Tên gõ tự do (tag do antd tạo) không có search: tìm theo nhãn / giá trị
              return (
                option.search ??
                toSearchKey(String(option.label ?? option.value ?? ""))
              ).includes(toSearchKey(input.trim()));
            }
          : () => false
      }
      // Đã chọn: tên ngắn (2 chữ cuối) / "Cả tổ …" đủ chữ, nối bằng dấu phẩy, hết chỗ mới xuống dòng
      tagRender={({ label, value: itemValue }) => {
        const text = typeof label === "string" ? label : String(itemValue);
        return (
          <span className="me-1 leading-6" title={text}>
            {isWholeValue(String(itemValue)) ? text : toShortName(text)}
            {value && itemValue !== value[value.length - 1] ? "," : ""}
          </span>
        );
      }}
      // Danh sách: "Họ tên (Mã NV)", "Cả tổ … (n người)"; dài thì xuống dòng
      optionRender={(option) => {
        const data = option.data as WorkerOption;
        return (
          <span
            className={`whitespace-normal ${
              isWholeValue(String(option.value)) ? "font-semibold" : ""
            }`}
          >
            {data.label}
            {data.hint && ` (${data.hint})`}
          </span>
        );
      }}
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
