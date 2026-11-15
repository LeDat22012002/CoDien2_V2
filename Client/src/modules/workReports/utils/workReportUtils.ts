import { PASTE_COLUMNS } from '@/modules/workReports/constants/workReportOptions';
import type {
  PastedWorkItemRow,
  WorkItemWorker,
  WorkItemWorkerRequest,
  WorkReportPhase,
} from '@/modules/workReports/types/workReports';

export const EMPLOYEE_PREFIX = 'e:';

/** Giá trị trong ô chọn người thực hiện: "e:<Id>" = nhân viên, chuỗi khác = tên gõ tự do. */
export const toWorkerValue = (worker: WorkItemWorker) =>
  worker.employeeId ? `${EMPLOYEE_PREFIX}${worker.employeeId}` : worker.displayName;

export const fromWorkerValue = (value: string): WorkItemWorkerRequest =>
  value.startsWith(EMPLOYEE_PREFIX) && Number(value.slice(EMPLOYEE_PREFIX.length)) > 0
    ? { employeeId: Number(value.slice(EMPLOYEE_PREFIX.length)) }
    : { displayName: value.trim() };

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

/**
 * Tách nội dung clipboard dạng bảng (Excel copy ra: cột cách nhau Tab, dòng cách nhau xuống dòng;
 * ô có xuống dòng được bọc trong dấu nháy kép, nháy kép bên trong viết thành "").
 */
export const parseClipboardTable = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let isQuoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (isQuoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        isQuoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === '') {
      isQuoted = true;
    } else if (char === '\t') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
};

/**
 * Bảng dán → dòng gửi Server theo thứ tự cột của sheet Excel cũ.
 * Bỏ dòng trống, dòng tiêu đề nhóm (không có đầu mục lẫn hạng mục) và dòng tiêu đề cột.
 */
export const toPastedRows = (table: string[][], phase: WorkReportPhase): PastedWorkItemRow[] => {
  const columns = PASTE_COLUMNS[phase];
  const categoryIndex = columns.findIndex((column) => column.field === 'category');
  const descriptionIndex = columns.findIndex((column) => column.field === 'description');

  return table
    .map((cells, index) => ({ cells: cells.map((cell) => cell.trim()), index }))
    .filter(({ cells }) => (cells[categoryIndex] ?? '') !== '' || (cells[descriptionIndex] ?? '') !== '')
    .filter(({ cells }) => !/công việc thực hiện/i.test(cells[categoryIndex] ?? ''))
    .map(({ cells, index }) => {
      const row: PastedWorkItemRow = { rowIndex: index + 1 };
      columns.forEach((column, columnIndex) => {
        const value = cells[columnIndex];
        if (column.field && value) row[column.field] = value;
      });
      return row;
    });
};

/** Dòng dán → lại thành 1 dòng chữ (Tab) để giữ trong ô dán khi dòng đó lỗi. */
export const toClipboardLine = (cells: string[]) =>
  cells.map((cell) => (/[\t\n"]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join('\t');

/** Phút → "480" (kèm "= 8 giờ" khi tròn giờ) để đọc nhanh. */
export const formatMinutesHint = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined || minutes === 0) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `= ${hours} giờ` : `≈ ${hours.toFixed(1).replace('.', ',')} giờ`;
};
