import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  App,
  AutoComplete,
  Button,
  ConfigProvider,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import type { ColumnType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { toApiError } from '@/shared/api/axiosClient';
import dayjs from '@/shared/utils/dayjs';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { EMPTY_TEXT, formatDate, formatDateTime, formatNumber, toIsoDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { EquipmentInput } from '@/modules/workReports/components/EquipmentInput';
import { FormStatusTag } from '@/modules/workReports/components/FormStatusTag';
import { WorkerSelect } from '@/modules/workReports/components/WorkerSelect';
import {
  FIVE_S_SUGGESTIONS,
  ROLE_LABELS,
  WORK_PERMIT_OPTIONS,
} from '@/modules/workReports/constants/workReportOptions';
import { useDeleteWorkItem, useSaveWorkItem } from '@/modules/workReports/hooks/useWorkReportQueries';
import type {
  WeeklyForm,
  WorkCategory,
  WorkItem,
  WorkItemRequest,
  WorkReportGrid,
} from '@/modules/workReports/types/workReports';
import {
  formatMinutesHint,
  fromWorkerValue,
  parseMinutesInput,
  toWorkerValue,
} from '@/modules/workReports/utils/workReportUtils';

/** Dòng của bảng: tiêu đề tổ/kíp (I, II…), tiêu đề đầu mục (A, B…), dòng công việc, dòng mới đang nhập. */
type GridRow =
  | { kind: 'unit'; key: string; form: WeeklyForm }
  | {
      kind: 'group';
      key: string;
      form: WeeklyForm;
      category: WorkCategory;
      count: number;
    }
  | { kind: 'item'; key: string; form: WeeklyForm; item: WorkItem }
  | { kind: 'draft'; key: string; form: WeeklyForm; categoryId: number };

/** Dòng đang sửa: itemId có = sửa dòng, không có = dòng mới thuộc đầu mục categoryId. */
interface EditingState {
  formId: number;
  itemId?: number;
  categoryId?: number;
}

interface RowFormValues {
  workCategoryId: number;
  equipmentCode?: string;
  description: string;
  workDate?: Dayjs;
  workers: string[];
  plannedMinutes?: string;
  actualMinutes?: string;
  resultPercent?: number | null;
  workPermit?: string | null;
  fiveS?: string;
  explanation?: string;
  note?: string;
}

interface WorkGridTableProps {
  grid: WorkReportGrid;
  /** Tổ/kíp hiển thị (đã lọc), theo thứ tự I, II… */
  forms: WeeklyForm[];
  onMaterials: (form: WeeklyForm) => void;
}

/** Cỡ chữ bảng (nhỏ hơn mặc định của app cho giống sheet Excel). */
const TABLE_THEME = {
  token: { fontSize: 12 },
  components: { Table: { cellPaddingBlockSM: 4, cellPaddingInlineSM: 6 } },
};
/** Cao tối đa của bảng: phần màn hình còn lại dưới thanh chọn tuần và tab (bảng tự cuộn, không cuộn cả trang). */
const TABLE_SCROLL_Y = 'max(420px, calc(100dvh - 380px))';

const toFormValues = (item: WorkItem): RowFormValues => ({
  workCategoryId: item.workCategoryId,
  equipmentCode: item.equipmentCode ?? undefined,
  description: item.description,
  workDate: dayjs(item.workDate),
  workers: item.workers.map(toWorkerValue),
  plannedMinutes: item.plannedMinutes?.toString() ?? undefined,
  actualMinutes: item.actualMinutes?.toString() ?? undefined,
  resultPercent: item.resultPercent ?? null,
  workPermit: item.workPermit ?? null,
  fiveS: item.fiveS ?? undefined,
  explanation: item.explanation ?? undefined,
  note: item.note ?? undefined,
});

const dash = <span className="text-text-secondary">{EMPTY_TEXT}</span>;

/** Chữ dài xuống dòng như ô Excel (Wrap text). */
const wrapText = (value?: string | null) =>
  value ? <span className="whitespace-pre-line wrap-break-word">{value}</span> : dash;

/** Tiêu đề cột 2 dòng: tên + số cột (n) như file Excel. */
const headerTitle = (label: string, columnNo?: number) => (
  <div className="flex flex-col items-center leading-tight">
    <span>{label}</span>
    {columnNo !== undefined && <span className="text-xs font-normal text-text-secondary">({columnNo})</span>}
  </div>
);

/**
 * Bảng công việc của xưởng trong 1 tuần (AntD Table), giống sheet Excel: mọi tổ/kíp trong 1 bảng (dòng I, II… tô vàng),
 * mỗi tổ nhóm theo đầu mục (dòng A, B… tô xanh). Bảng có thanh cuộn riêng (ngang + dọc), tiêu đề cột đứng yên.
 * Sửa tại chỗ từng dòng: double-click hoặc bấm bút; Enter lưu, Esc hủy; Tab chuyển ô.
 * Kế hoạch: sửa cột (3)(5)(6)(7)(9)(11)(18). Báo cáo: dòng kế hoạch sửa phần thực hiện; thêm dòng phát sinh.
 */
export const WorkGridTable = ({ grid, forms, onMaterials }: WorkGridTableProps) => {
  const { modal } = App.useApp();
  const [rowForm] = Form.useForm<RowFormValues>();
  const [editing, setEditing] = useState<EditingState>();
  const saveMutation = useSaveWorkItem();
  const deleteMutation = useDeleteWorkItem();

  const { phase, week, categories } = grid;
  const isReport = phase === 'REPORT';
  const weekLabel = `Tuần ${String(week.isoWeek).padStart(2, '0')}`;
  const editingForm = forms.find((form) => form.formId === editing?.formId);
  const editingItem =
    editing?.itemId === undefined ? undefined : editingForm?.items.find((item) => item.id === editing.itemId);
  const isDraft = editing !== undefined && editing.itemId === undefined;
  const isBusy = editing !== undefined;
  // Đầu mục chỉ đổi ở kế hoạch, hoặc với dòng phát sinh
  const isCategoryEditable = isDraft || !isReport || Boolean(editingItem?.isUnplanned);
  const watchedWorkers = Form.useWatch('workers', rowForm) ?? [];
  const watchedMinutes = {
    plannedMinutes: Form.useWatch('plannedMinutes', rowForm),
    actualMinutes: Form.useWatch('actualMinutes', rowForm),
  };

  const rows = useMemo<GridRow[]>(() => {
    const result: GridRow[] = [];
    forms.forEach((form) => {
      result.push({ kind: 'unit', key: `unit-${form.formId}`, form });
      categories.forEach((category) => {
        const items = form.items.filter((item) => item.workCategoryId === category.id);
        const hasDraft = isDraft && editing?.formId === form.formId && editing.categoryId === category.id;
        // Đầu mục trống: chỉ hiện khi đang lập kế hoạch (để có nút Thêm dòng) và đầu mục còn dùng
        if (items.length === 0 && !hasDraft && !(!isReport && form.canEditNow && category.isActive)) return;
        result.push({
          kind: 'group',
          key: `group-${form.formId}-${category.id}`,
          form,
          category,
          count: items.length,
        });
        items.forEach((item) => result.push({ kind: 'item', key: `item-${item.id}`, form, item }));
        if (hasDraft)
          result.push({
            kind: 'draft',
            key: `draft-${form.formId}`,
            form,
            categoryId: category.id,
          });
      });
    });
    return result;
  }, [forms, categories, isDraft, editing, isReport]);

  const startEdit = (form: WeeklyForm, item: WorkItem) => {
    if (!form.canEditNow || (!isReport && item.isUnplanned)) return;
    rowForm.setFieldsValue(toFormValues(item));
    setEditing({ formId: form.formId, itemId: item.id });
  };

  const startDraft = (form: WeeklyForm, categoryId: number) => {
    rowForm.resetFields();
    rowForm.setFieldsValue({
      workCategoryId: categoryId,
      workers: [],
      description: '',
      // Ngày mặc định: hôm nay nếu trong tuần, không thì thứ 2 của tuần
      workDate: (() => {
        const today = dayjs().format('YYYY-MM-DD');
        return today >= week.startDate && today <= week.endDate ? dayjs(today) : dayjs(week.startDate);
      })(),
    });
    setEditing({ formId: form.formId, categoryId });
  };

  const cancelEdit = () => {
    setEditing(undefined);
    rowForm.resetFields();
  };

  const handleSave = async () => {
    if (!editingForm) return;
    let values: RowFormValues;
    try {
      values = await rowForm.validateFields();
    } catch {
      return;
    }

    const workerCount = values.workers.length;
    const planned = parseMinutesInput(values.plannedMinutes, workerCount);
    const actual = parseMinutesInput(values.actualMinutes, workerCount);
    if (planned === undefined || actual === undefined) {
      rowForm.setFields([
        {
          name: planned === undefined ? 'plannedMinutes' : 'actualMinutes',
          errors: ['Nhập số phút hoặc dạng 8h'],
        },
      ]);
      return;
    }

    const request: WorkItemRequest = {
      workCategoryId: values.workCategoryId,
      equipmentCode: values.equipmentCode?.trim() || null,
      description: values.description.trim(),
      workDate: toIsoDate(values.workDate) ?? null,
      workers: values.workers.map(fromWorkerValue),
      plannedMinutes: planned,
      actualMinutes: actual,
      resultPercent: values.resultPercent ?? null,
      workPermit: values.workPermit ?? null,
      fiveS: values.fiveS?.trim() || null,
      explanation: values.explanation?.trim() || null,
      note: values.note?.trim() || null,
    };

    try {
      if (editingItem) {
        await saveMutation.mutateAsync({
          mode: 'update',
          id: editingItem.id,
          phase,
          request: { ...request, rowVersion: editingItem.rowVersion },
        });
      } else {
        await saveMutation.mutateAsync({
          mode: 'create',
          formId: editingForm.formId,
          phase,
          request,
        });
      }
      cancelEdit();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 409) {
        // Người khác vừa sửa: bỏ bản đang sửa, lưới tải lại dữ liệu mới nhất
        notify.warning(apiError.message, {
          toastId: `conflict-${editingItem?.id ?? 'draft'}`,
        });
        cancelEdit();
        return;
      }

      if (!applyServerErrors(rowForm, error)) notify.apiError(error);
    }
  };

  const confirmDelete = (item: WorkItem) =>
    modal.confirm({
      title: `Xóa dòng ${item.code}?`,
      content: 'Vật tư gắn với dòng này cũng bị xóa. Mã công việc đã cấp không dùng lại.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync({ id: item.id, phase });
          notify.success('Đã xóa dòng công việc.');
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') cancelEdit();
  };

  const isEditingRow = (row: GridRow) =>
    (row.kind === 'item' && editing?.itemId === row.item.id) || row.kind === 'draft';

  const isHeaderRow = (row: GridRow) => row.kind === 'unit' || row.kind === 'group';

  /** Ô đang sửa thì hiện control, không thì hiện giá trị. */
  const cell = (row: GridRow, editor: ReactNode, display: () => ReactNode) => {
    if (isHeaderRow(row)) return null;
    if (isEditingRow(row)) return editor;
    return display();
  };

  const itemOf = (row: GridRow) => (row.kind === 'item' ? row.item : undefined);

  const minutesEditor = (name: 'plannedMinutes' | 'actualMinutes', label: string) => (
    <Form.Item
      name={name}
      className="mb-0"
      extra={formatMinutesHint(parseMinutesInput(watchedMinutes[name], watchedWorkers.length) ?? null)}
    >
      <Input aria-label={label} placeholder="phút / 8h" onPressEnter={handleSave} className="text-right" />
    </Form.Item>
  );

  /** Dòng tiêu đề tổ/kíp: thứ tự La Mã, tên, trạng thái, hạn, tổng phút, nút Dán Excel / Vật tư. */
  const renderUnitRow = (form: WeeklyForm) => (
    // sticky: nội dung luôn thấy khi cuộn ngang bảng
    <div className="sticky inset-s-2 inline-flex items-center gap-x-3 whitespace-nowrap">
      <Typography.Text strong>
        {form.orderLabel}. {form.unitName}
      </Typography.Text>
      <FormStatusTag status={form.status} />
      {form.status === 'LOCKED' && form.canEditLocked && (
        <Tooltip title="Đã quá hạn nhưng quản đốc / phó quản đốc vẫn sửa được">
          <LockOutlined className="text-warning" aria-label="Quản đốc sửa khi khóa" />
        </Tooltip>
      )}
      <Typography.Text type="secondary">
        Hạn {formatDateTime(form.deadlineAt)} · {form.itemCount} dòng · KH {formatNumber(form.totalPlannedMinutes)} phút
        {isReport && ` · Thực tế ${formatNumber(form.totalActualMinutes)} phút`} · {ROLE_LABELS[form.role]}
      </Typography.Text>
      <Tooltip title="Vật tư sử dụng của tổ/kíp">
        <Button size="small" icon={<InboxOutlined />} onClick={() => onMaterials(form)}>
          Vật tư
        </Button>
      </Tooltip>
    </div>
  );

  /** Dòng tiêu đề đầu mục: chữ nhóm, tên, số dòng, nút thêm dòng. */
  const renderGroupRow = (row: Extract<GridRow, { kind: 'group' }>) => (
    <div className="sticky inset-s-2 inline-flex items-center gap-2 whitespace-nowrap">
      <Typography.Text strong>
        {row.category.groupLetter}. {row.category.name}
      </Typography.Text>
      <Typography.Text type="secondary">
        ({row.category.code}) · {row.count} dòng
      </Typography.Text>
      {/* Chỉ thêm dòng ở kế hoạch; báo cáo không thêm việc phát sinh trên bảng */}
      {!isReport && row.form.canEditNow && row.category.isActive && (
        <Button
          size="small"
          type="link"
          icon={<PlusOutlined />}
          disabled={isBusy}
          onClick={() => startDraft(row.form, row.category.id)}
        >
          Thêm dòng
        </Button>
      )}
    </div>
  );

  const leafColumns: ColumnType<GridRow>[] = [];
  /** Cột lá: dòng tiêu đề tổ/đầu mục gộp hết vào cột đầu (các cột khác colSpan 0). */
  const leaf = (column: ColumnType<GridRow>): ColumnType<GridRow> => {
    const result: ColumnType<GridRow> = {
      ...column,
      onCell: (row) => {
        if (!isHeaderRow(row)) return {};
        if (leafColumns[0] !== result) return { colSpan: 0 };
        return {
          colSpan: leafColumns.length,
          className: row.kind === 'unit' ? 'bg-warning/15 text-left' : 'bg-success/10 text-left',
        };
      },
    };
    leafColumns.push(result);
    return result;
  };

  const columns: TableColumnsType<GridRow> = [
    // Không đặt align ở cột TT: ô gộp của dòng tiêu đề phải căn trái; số TT căn giữa bên trong
    leaf({
      title: headerTitle('TT', 1),
      key: 'tt',
      width: 52,
      render: (_, row) => {
        if (row.kind === 'unit') return renderUnitRow(row.form);
        if (row.kind === 'group') return renderGroupRow(row);
        return (
          <div className="text-center">
            {row.kind === 'item' ? row.item.tt : <PlusOutlined className="text-primary" aria-label="Dòng mới" />}
          </div>
        );
      },
    }),
    leaf({
      title: '',
      key: 'actions',
      width: 76,
      render: (_, row) => {
        if (isEditingRow(row)) {
          return (
            <div className="flex justify-center">
              <Tooltip title="Lưu (Enter)">
                <Button
                  type="text"
                  size="small"
                  aria-label="Lưu dòng"
                  icon={<SaveOutlined className="text-primary" />}
                  loading={saveMutation.isPending}
                  onClick={handleSave}
                />
              </Tooltip>
              <Tooltip title="Hủy (Esc)">
                <Button type="text" size="small" aria-label="Hủy sửa" icon={<CloseOutlined />} onClick={cancelEdit} />
              </Tooltip>
            </div>
          );
        }

        const item = itemOf(row);
        if (!item || !row.form.canEditNow) return null;
        // Báo cáo: không xóa dòng kế hoạch; kế hoạch: không sửa / xóa dòng phát sinh
        const canEditRow = isReport || !item.isUnplanned;
        const canDelete = isReport ? item.isUnplanned : !item.isUnplanned;
        return (
          <div className="flex justify-center">
            {canEditRow && (
              <Tooltip title="Sửa (double-click dòng)">
                <Button
                  type="text"
                  size="small"
                  aria-label={`Sửa dòng ${item.code}`}
                  icon={<EditOutlined className="text-primary" />}
                  disabled={isBusy}
                  onClick={() => startEdit(row.form, item)}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  size="small"
                  danger
                  aria-label={`Xóa dòng ${item.code}`}
                  icon={<DeleteOutlined />}
                  disabled={isBusy}
                  onClick={() => confirmDelete(item)}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    }),
    leaf({
      title: headerTitle('Tổ thực hiện', 2),
      key: 'unit',
      width: 150,
      render: (_, row) => (isHeaderRow(row) ? null : wrapText(row.form.unitName)),
    }),
    leaf({
      title: headerTitle('Công việc thực hiện', 3),
      key: 'category',
      width: 130,
      render: (_, row) =>
        cell(
          row,
          <Form.Item name="workCategoryId" className="mb-0" rules={[{ required: true, message: 'Chọn đầu mục' }]}>
            <Select
              aria-label="Công việc thực hiện"
              disabled={!isCategoryEditable}
              options={categories
                .filter((category) => category.isActive)
                .map((category) => ({
                  value: category.id,
                  label: `${category.groupLetter} · ${category.code}`,
                }))}
            />
          </Form.Item>,
          () => itemOf(row)?.categoryCode ?? dash,
        ),
    }),
    leaf({
      title: headerTitle('Mã công việc', 4),
      key: 'code',
      width: 150,
      render: (_, row) =>
        row.kind === 'draft' ? (
          <Typography.Text type="secondary">Tự sinh</Typography.Text>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span className="font-mono">{itemOf(row)?.code}</span>
            {itemOf(row)?.isUnplanned && (
              <Tooltip title="Việc phát sinh (không có trong kế hoạch)">
                <span className="rounded bg-warning/15 px-1 text-xs text-warning">PS</span>
              </Tooltip>
            )}
          </span>
        ),
    }),
    leaf({
      title: headerTitle('Equipment', 5),
      key: 'equipment',
      width: 160,
      render: (_, row) =>
        cell(
          row,
          <Form.Item name="equipmentCode" className="mb-0" rules={[{ max: 50, message: 'Tối đa 50 ký tự' }]}>
            <EquipmentInput onPressEnter={handleSave} />
          </Form.Item>,
          () => {
            const item = itemOf(row);
            return item?.equipmentCode ? (
              <Tooltip
                title={item.equipmentName ?? (item.equipmentId ? undefined : 'Mã gõ tự do (không có trong danh mục)')}
              >
                <span className="break-all font-mono">{item.equipmentCode}</span>
              </Tooltip>
            ) : (
              dash
            );
          },
        ),
    }),
    leaf({
      title: headerTitle('Hạng mục công việc', 6),
      key: 'description',
      width: 300,
      render: (_, row) =>
        cell(
          row,
          <Form.Item
            name="description"
            className="mb-0"
            rules={[
              { required: true, whitespace: true, message: 'Nhập hạng mục' },
              { max: 1000, message: 'Tối đa 1000 ký tự' },
            ]}
          >
            <Input.TextArea aria-label="Hạng mục công việc" autoSize={{ minRows: 1, maxRows: 4 }} autoFocus />
          </Form.Item>,
          () => wrapText(itemOf(row)?.description),
        ),
    }),
    leaf({
      title: headerTitle('Ngày thực hiện', 7),
      key: 'workDate',
      width: 130,
      align: 'center',
      render: (_, row) =>
        cell(
          row,
          <Form.Item name="workDate" className="mb-0" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker
              aria-label="Ngày thực hiện"
              format="DD/MM/YYYY"
              className="w-full"
              allowClear={false}
              minDate={dayjs(week.startDate)}
              maxDate={dayjs(week.endDate)}
              defaultPickerValue={dayjs(week.startDate)}
            />
          </Form.Item>,
          () => formatDate(itemOf(row)?.workDate),
        ),
    }),
    {
      title: 'Nhân sự thực hiện (Người)',
      key: 'people',
      children: [
        leaf({
          title: headerTitle('Số người', 8),
          key: 'workerCount',
          width: 72,
          align: 'center',
          render: (_, row) => (isEditingRow(row) ? watchedWorkers.length : itemOf(row)?.workerCount),
        }),
        leaf({
          title: headerTitle('Tên người thực hiện', 9),
          key: 'workers',
          width: 220,
          render: (_, row) =>
            cell(
              row,
              <Form.Item name="workers" className="mb-0">
                <WorkerSelect unitId={row.form.unitId} initialWorkers={editingItem?.workers} />
              </Form.Item>,
              () =>
                wrapText(
                  itemOf(row)
                    ?.workers.map((worker) => worker.displayName)
                    .join(', '),
                ),
            ),
        }),
        leaf({
          title: headerTitle('KTV phụ trách', 10),
          key: 'engineers',
          width: 160,
          render: (_, row) => (isHeaderRow(row) ? null : wrapText(row.form.engineerNames?.split(', ').join('\n'))),
        }),
      ],
    },
    {
      title: 'Giờ công thực hiện (phút)',
      key: 'minutes',
      children: [
        leaf({
          title: headerTitle('Theo kế hoạch', 11),
          key: 'plannedMinutes',
          width: 110,
          align: 'right',
          render: (_, row) =>
            !isReport
              ? cell(row, minutesEditor('plannedMinutes', 'Giờ công kế hoạch'), () =>
                  formatNumber(itemOf(row)?.plannedMinutes, 2),
                )
              : row.kind === 'draft'
                ? EMPTY_TEXT
                : formatNumber(itemOf(row)?.plannedMinutes, 2),
        }),
        ...(isReport
          ? [
              leaf({
                title: headerTitle('Theo thực tế', 12),
                key: 'actualMinutes',
                width: 110,
                align: 'right',
                render: (_, row) =>
                  cell(row, minutesEditor('actualMinutes', 'Giờ công thực tế'), () => {
                    const item = itemOf(row);
                    if (!item) return null;
                    return item.actualMinutes === null || item.actualMinutes === undefined ? (
                      <Tooltip title="Chưa nhập: tính bằng giờ kế hoạch">
                        <span className="text-text-secondary">{formatNumber(item.effectiveActualMinutes, 2)}</span>
                      </Tooltip>
                    ) : (
                      formatNumber(item.actualMinutes, 2)
                    );
                  }),
              }),
              leaf({
                title: headerTitle('Chênh lệch', 13),
                key: 'diff',
                width: 90,
                align: 'right',
                render: (_, row) => {
                  const item = itemOf(row);
                  if (!item || isEditingRow(row)) return null;
                  return (
                    <span className={item.diffMinutes > 0 ? 'text-error' : item.diffMinutes < 0 ? 'text-success' : ''}>
                      {formatNumber(item.diffMinutes, 2)}
                    </span>
                  );
                },
              }),
            ]
          : []),
      ],
    },
    ...(isReport
      ? [
          leaf({
            title: headerTitle('Kết quả thực hiện', 14),
            key: 'resultPercent',
            width: 100,
            align: 'center',
            render: (_, row) =>
              cell(
                row,
                <Form.Item name="resultPercent" className="mb-0">
                  <InputNumber aria-label="Kết quả thực hiện" min={0} max={100} className="w-full" suffix="%" />
                </Form.Item>,
                () => {
                  const value = itemOf(row)?.resultPercent;
                  return value === null || value === undefined ? EMPTY_TEXT : `${formatNumber(value, 2)}%`;
                },
              ),
          }),
          leaf({
            title: headerTitle('GPLV', 15),
            key: 'workPermit',
            width: 90,
            align: 'center',
            render: (_, row) =>
              cell(
                row,
                <Form.Item name="workPermit" className="mb-0">
                  <Select aria-label="Giấy phép làm việc" allowClear options={WORK_PERMIT_OPTIONS} />
                </Form.Item>,
                () => itemOf(row)?.workPermit ?? EMPTY_TEXT,
              ),
          }),
          leaf({
            title: headerTitle('5S', 16),
            key: 'fiveS',
            width: 120,
            render: (_, row) =>
              cell(
                row,
                <Form.Item name="fiveS" className="mb-0" rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}>
                  <AutoComplete aria-label="5S" options={FIVE_S_SUGGESTIONS} />
                </Form.Item>,
                () => wrapText(itemOf(row)?.fiveS),
              ),
          }),
          leaf({
            title: headerTitle('Diễn giải (Phương án, biện pháp xử lý, lý do chưa hoàn thành)', 17),
            key: 'explanation',
            width: 220,
            render: (_, row) =>
              cell(
                row,
                <Form.Item name="explanation" className="mb-0" rules={[{ max: 1000, message: 'Tối đa 1000 ký tự' }]}>
                  <Input.TextArea aria-label="Diễn giải" autoSize={{ minRows: 1, maxRows: 4 }} />
                </Form.Item>,
                () => wrapText(itemOf(row)?.explanation),
              ),
          }),
        ]
      : []),
    leaf({
      title: headerTitle('Ghi chú', 18),
      key: 'note',
      width: 180,
      render: (_, row) =>
        cell(
          row,
          <Form.Item name="note" className="mb-0" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
            <Input.TextArea aria-label="Ghi chú" autoSize={{ minRows: 1, maxRows: 4 }} />
          </Form.Item>,
          () => wrapText(itemOf(row)?.note),
        ),
    }),
    leaf({
      title: headerTitle('Tuần'),
      key: 'week',
      width: 80,
      align: 'center',
      render: (_, row) => (isHeaderRow(row) ? null : weekLabel),
    }),
  ];

  const scrollX = leafColumns.reduce(
    (total, column) => total + (typeof column.width === 'number' ? column.width : 0),
    0,
  );

  return (
    <Form<RowFormValues> form={rowForm} component={false}>
      <ConfigProvider theme={TABLE_THEME}>
        <div onKeyDown={handleKeyDown}>
          <Table<GridRow>
            rowKey="key"
            size="small"
            bordered
            columns={columns}
            dataSource={rows}
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: scrollX, y: TABLE_SCROLL_Y }}
            title={() => <div className="text-center text-sm font-bold uppercase">{grid.title}</div>}
            className={[
              '[&_.ant-table-title]:bg-warning/25',
              // Viền rõ từng ô: ô, khung bảng, thanh tiêu đề
              '[&_.ant-table-cell]:border-[color-mix(in_srgb,var(--app-color-text)_25%,transparent)]!',
              '[&_.ant-table-container]:border-[color-mix(in_srgb,var(--app-color-text)_25%,transparent)]!',
              '[&_.ant-table-title]:border-[color-mix(in_srgb,var(--app-color-text)_25%,transparent)]!',
              // Nền tiêu đề đặc (không trong suốt) để nội dung cuộn không lộ qua
              '[&_.ant-table-thead_th]:bg-[color-mix(in_srgb,var(--app-color-primary)_12%,var(--app-color-bg-container))]!',
              '[&_.ant-table-thead_th]:text-center! [&_.ant-table-thead_th]:align-middle [&_.ant-table-thead_th]:font-semibold',
              '[&_.ant-table-thead_th]:whitespace-normal',
              '[&_.ant-form-item-extra]:min-h-0 [&_.ant-form-item-extra]:text-xs',
              '[&_.ant-table-tbody_td]:align-middle',
            ].join(' ')}
            onRow={(row) => ({
              onDoubleClick: () => {
                if (row.kind === 'item' && !isBusy) startEdit(row.form, row.item);
              },
            })}
            rowClassName={(row) => (isEditingRow(row) ? 'bg-primary/5' : '')}
            locale={{
              emptyText: 'Chưa có đầu mục công việc áp dụng cho xưởng.',
            }}
          />
        </div>
      </ConfigProvider>
    </Form>
  );
};
