import { Alert, Input, Modal, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import { EMPTY_TEXT } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { PASTE_COLUMNS, PHASE_LABELS, WORK_ITEM_FIELD_LABELS } from '@/modules/workReports/constants/workReportOptions';
import { useBatchCreateWorkItems } from '@/modules/workReports/hooks/useWorkReportQueries';
import type {
  PastedRowError,
  PastedWorkItemRow,
  WeeklyForm,
  WorkReportPhase,
} from '@/modules/workReports/types/workReports';
import { parseClipboardTable, toClipboardLine, toPastedRows } from '@/modules/workReports/utils/workReportUtils';

interface PasteItemsModalProps {
  open: boolean;
  form?: WeeklyForm;
  phase: WorkReportPhase;
  onClose: () => void;
}

/**
 * Dán nhiều dòng từ sheet tổ của file Excel cũ (copy nguyên dòng, đủ cột như sheet).
 * Server chuẩn hóa từng ô: dòng đúng lưu ngay, dòng sai giữ lại trong ô dán kèm lỗi để sửa rồi gửi lại.
 */
export const PasteItemsModal = ({ open, form, phase, onClose }: PasteItemsModalProps) => {
  const [text, setText] = useState('');
  const [rowErrors, setRowErrors] = useState<PastedRowError[]>([]);
  const batchMutation = useBatchCreateWorkItems();
  const columns = PASTE_COLUMNS[phase];

  const table = useMemo(() => parseClipboardTable(text), [text]);
  const rows = useMemo(() => toPastedRows(table, phase), [table, phase]);

  const handleClose = () => {
    setText('');
    setRowErrors([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form || rows.length === 0) return;
    try {
      const result = await batchMutation.mutateAsync({ formId: form.formId, phase, rows });
      if (result.errors.length === 0) {
        notify.success(`Đã thêm ${result.created.length} dòng vào ${form.unitName}.`);
        handleClose();
        return;
      }

      notify.warning(`Đã thêm ${result.created.length} dòng; ${result.errors.length} dòng lỗi cần sửa.`);
      // Giữ lại đúng các dòng lỗi trong ô dán, đánh số lại theo thứ tự mới
      const failedLines = result.errors.map((error) => table[error.rowIndex - 1] ?? []);
      setRowErrors(result.errors.map((error, index) => ({ ...error, rowIndex: index + 1 })));
      setText(failedLines.map(toClipboardLine).join('\n'));
    } catch (error) {
      notify.apiError(error);
    }
  };

  const errorByRow = new Map(rowErrors.map((error) => [error.rowIndex, error.errors]));

  const previewColumns: TableColumnsType<PastedWorkItemRow> = [
    { title: 'Dòng', dataIndex: 'rowIndex', key: 'rowIndex', width: COLUMN_WIDTH.index, align: 'center' },
    ...columns
      .filter((column) => column.field)
      .map((column) => ({
        title: column.label,
        key: column.field as string,
        width: column.field === 'description' ? COLUMN_WIDTH.longText : COLUMN_WIDTH.tag,
        render: (_: unknown, row: PastedWorkItemRow) => {
          const value = row[column.field as keyof PastedWorkItemRow];
          const fieldErrors = errorByRow.get(row.rowIndex)?.[column.field as string];
          return (
            <div>
              <Typography.Text ellipsis={{ tooltip: value }} className="block">
                {value || <span className="text-text-secondary">{EMPTY_TEXT}</span>}
              </Typography.Text>
              {fieldErrors && <Typography.Text type="danger" className="block text-sm">{fieldErrors.join(' ')}</Typography.Text>}
            </div>
          );
        },
      })),
  ];

  return (
    <Modal
      open={open}
      title={form ? `Dán từ Excel – ${form.orderLabel} ${form.unitName} (${PHASE_LABELS[phase]})` : 'Dán từ Excel'}
      okText={rows.length > 0 ? `Thêm ${rows.length} dòng` : 'Thêm dòng'}
      cancelText="Đóng"
      okButtonProps={{ disabled: rows.length === 0 }}
      confirmLoading={batchMutation.isPending}
      onOk={handleSubmit}
      onCancel={handleClose}
      mask={{ closable: false }}
      width={{ xs: '96%', lg: 1100 }}
      centered
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        <Alert
          type="info"
          showIcon
          title="Copy nguyên các dòng trong sheet tổ của file Excel cũ rồi dán vào ô dưới (Ctrl+V)."
          description={
            <div className="flex flex-wrap gap-1 pt-1">
              {columns.map((column) => (
                <Tag key={column.label} color={column.field ? 'blue' : undefined}>
                  {column.label}
                  {column.field ? '' : ' (bỏ qua)'}
                </Tag>
              ))}
              <Typography.Text type="secondary" className="block w-full pt-1">
                Dòng tiêu đề nhóm (A, B…) và dòng trống được bỏ qua. Giờ công nhận số phút hoặc "8h" (= số người × 8 × 60).
                {phase === 'REPORT' && ' Ở giai đoạn báo cáo, các dòng dán vào là việc phát sinh.'}
              </Typography.Text>
            </div>
          }
        />

        {rowErrors.length > 0 && (
          <Alert
            type="warning"
            showIcon
            title={`${rowErrors.length} dòng lỗi còn lại trong ô dán: sửa theo thông báo bên dưới rồi bấm thêm lại.`}
            description={
              <ul className="mb-0 list-disc pl-5">
                {rowErrors.map((error) => (
                  <li key={error.rowIndex}>
                    Dòng {error.rowIndex}:{' '}
                    {Object.entries(error.errors)
                      .map(([field, messages]) => `${WORK_ITEM_FIELD_LABELS[field] ?? field} – ${messages.join(' ')}`)
                      .join('; ')}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        <Input.TextArea
          aria-label="Nội dung dán từ Excel"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (rowErrors.length > 0) setRowErrors([]);
          }}
          placeholder="Dán (Ctrl+V) các dòng copy từ Excel vào đây…"
          autoSize={{ minRows: 4, maxRows: 8 }}
          className="font-mono"
          wrap="off"
        />

        {rows.length > 0 && (
          <Table<PastedWorkItemRow>
            rowKey="rowIndex"
            size="small"
            bordered
            columns={previewColumns}
            dataSource={rows}
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: 'max-content', y: 280 }}
            title={() => `Xem trước ${rows.length} dòng sẽ gửi`}
          />
        )}
      </div>
    </Modal>
  );
};
