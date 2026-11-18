import { formatDate } from '@/shared/utils/format';
import type {
  WorkItemBase,
  WorkItemWorker,
  WorkItemWorkerRequest,
  WorkReportRole,
} from '@/modules/workReports/types/workReports';

/** Tên ngắn: 2 chữ cuối, "Nguyễn Tấn Lộc Ninh" → "Lộc Ninh". */
export const toShortName = (fullName: string) => fullName.trim().split(/\s+/).slice(-2).join(' ');

/**
 * Được sửa / xóa dòng (khớp Server WorkItemSupport.EnsureRowEngineerAsync): kỹ sư chỉ dòng mình là KTV phụ trách;
 * admin, quản đốc/phó, đội trưởng/phó mọi dòng; dòng cũ chưa lưu KTV theo dòng không giới hạn.
 */
export const isRowEngineer = (
  role: WorkReportRole,
  item: Pick<WorkItemBase, 'engineers'>,
  employeeId: number | null | undefined,
) =>
  role === 'ADMIN' ||
  role === 'WORKSHOP_MANAGER' ||
  role === 'TEAM_MANAGER' ||
  item.engineers.length === 0 ||
  (employeeId != null && item.engineers.some((engineer) => engineer.employeeId === employeeId));

export const EMPLOYEE_PREFIX = 'e:';

/** Giá trị trong ô chọn người thực hiện: "e:<Id>" = nhân viên, chuỗi khác = tên gõ tự do. */
export const toWorkerValue = (worker: WorkItemWorker) =>
  worker.employeeId ? `${EMPLOYEE_PREFIX}${worker.employeeId}` : worker.displayName;

export const fromWorkerValue = (value: string): WorkItemWorkerRequest =>
  value.startsWith(EMPLOYEE_PREFIX) && Number(value.slice(EMPLOYEE_PREFIX.length)) > 0
    ? { employeeId: Number(value.slice(EMPLOYEE_PREFIX.length)) }
    : { displayName: value.trim() };

/** "Cả tổ": giá trị "all:<số người tổ/kíp>" (mang theo số người để đếm khi đang nhập; Server tự lấy danh sách lúc lưu). */
export const WHOLE_UNIT_PREFIX = 'all:';

export const toWholeUnitValue = (memberCount: number) => `${WHOLE_UNIT_PREFIX}${memberCount}`;

export const isWholeUnitValue = (value: string) => value.startsWith(WHOLE_UNIT_PREFIX);

/**
 * "Cả tổ" của 1 tổ gợi ý (đơn vị có tổ gợi ý, vd sheet Lọc bụi gồm tổ Lò cao 1, 2 và tổ Lò cao 3, 4):
 * "grp:<OrgUnitId>:<số người>". Chọn được nhiều tổ cùng lúc.
 */
export const WHOLE_GROUP_PREFIX = 'grp:';

export const toWholeGroupValue = (orgUnitId: number, memberCount: number) =>
  `${WHOLE_GROUP_PREFIX}${orgUnitId}:${memberCount}`;

export const isWholeGroupValue = (value: string) => value.startsWith(WHOLE_GROUP_PREFIX);

export const parseWholeGroupValue = (value: string) => {
  const [orgUnitId, memberCount] = value.slice(WHOLE_GROUP_PREFIX.length).split(':');
  return { orgUnitId: Number(orgUnitId) || 0, memberCount: Number(memberCount) || 0 };
};

/** "Cả tổ" (cả đơn vị hoặc của 1 tổ gợi ý). */
export const isWholeValue = (value: string) => isWholeUnitValue(value) || isWholeGroupValue(value);

/** Tên ngắn của tổ: phần sau dấu " - " cuối, "Tổ Cơ khí - Lọc bụi - Lò cao 1, 2" → "Lò cao 1, 2". */
export const toGroupShortName = (name: string) => name.split(' - ').pop()?.trim() || name;

/** Nhãn "Cả tổ" của 1 tổ gợi ý: "Cả tổ Lò cao 1, 2". */
export const wholeGroupLabel = (name: string) => `Cả tổ ${toGroupShortName(name)}`;

/** Số người của ô người thực hiện: "Cả tổ" = số người tổ/kíp (tổ gợi ý: cộng các tổ), còn lại = số mục đã chọn. */
export const countWorkerValues = (values: string[] | undefined) => {
  const wholeUnit = values?.find(isWholeUnitValue);
  if (wholeUnit) return Number(wholeUnit.slice(WHOLE_UNIT_PREFIX.length)) || 0;
  const groups = values?.filter(isWholeGroupValue) ?? [];
  if (groups.length > 0) return groups.reduce((sum, value) => sum + parseWholeGroupValue(value).memberCount, 0);
  return values?.length ?? 0;
};

const HOURS_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(h|g|giờ|gio)$/i;
const MINUTES_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(p|ph|phút|phut|')?$/i;

/**
 * Ô giờ công: số = phút; "8h" / "1,5h" = số người × giờ × 60 (giống quy ước file Excel).
 * Trả null khi ô trống, undefined khi không đọc được.
 */
export const parseMinutesInput = (raw: string | number | null | undefined, workerCount: number) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const text = raw.trim();
  if (text === '') return null;

  const hours = HOURS_PATTERN.exec(text);
  if (hours) return Math.round(Number(hours[1].replace(',', '.')) * 60 * Math.max(1, workerCount) * 100) / 100;

  const minutes = MINUTES_PATTERN.exec(text);
  if (minutes) return Number(minutes[1].replace(',', '.'));

  return undefined;
};

/** Thời gian thực hiện: cùng ngày → "dd/MM/yyyy"; khác ngày → "dd/MM – dd/MM/yyyy" (khác năm thì ghi đủ năm cả 2). */
export const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate) return formatDate(startDate);
  if (!endDate || endDate === startDate) return formatDate(startDate);
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = formatDate(startDate);
  return `${sameYear ? start.slice(0, 5) : start} – ${formatDate(endDate)}`;
};
