import { EditOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Modal,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { COLUMN_WIDTH } from '@/shared/constants/tableColumns';
import dayjs from '@/shared/utils/dayjs';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { formatDateTime } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { useUpdateWorkWeekDeadline, useWorkWeeks } from '@/modules/workReports/hooks/useWorkReportQueries';
import type { UpdateWorkWeekDeadlineRequest, WorkWeek } from '@/modules/workReports/types/workReports';

interface WorkshopOption {
  value: number;
  label: string;
}

interface WeekDeadlinePanelProps {
  workshops: WorkshopOption[];
}

interface DeadlineFormValues {
  planDeadlineAt?: Dayjs | null;
  reportDeadlineAt?: Dayjs | null;
}

/** Giờ địa phương gửi Server (không kèm múi giờ, giống các mốc nghiệp vụ khác). */
const toLocalIso = (value?: Dayjs | null) => (value ? value.format('YYYY-MM-DDTHH:mm:00') : null);

const CURRENT_YEAR = dayjs().year();

/**
 * Hạn nộp theo tuần: hạn chung toàn nhà máy (chỉnh tay thì đổi cấu hình mặc định không ghi đè)
 * hoặc hạn riêng 1 xưởng (trống = theo hạn chung). Báo cáo tuần N và kế hoạch tuần N+1 thường khóa cùng lúc.
 */
export const WeekDeadlinePanel = ({ workshops }: WeekDeadlinePanelProps) => {
  const [form] = Form.useForm<DeadlineFormValues>();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [workshopId, setWorkshopId] = useState<number>();
  const [editing, setEditing] = useState<WorkWeek>();
  const weeksQuery = useWorkWeeks(year, workshopId);
  const updateMutation = useUpdateWorkWeekDeadline();
  const workshopName = workshops.find((workshop) => workshop.value === workshopId)?.label;

  const submit = async (request: UpdateWorkWeekDeadlineRequest, successMessage: string) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({ id: editing.id, request });
      notify.success(successMessage);
      setEditing(undefined);
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  const handleSave = async () => {
    let values: DeadlineFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    await submit(
      {
        workshopId,
        planDeadlineAt: toLocalIso(values.planDeadlineAt),
        reportDeadlineAt: toLocalIso(values.reportDeadlineAt),
      },
      'Đã cập nhật hạn nộp.',
    );
  };

  const handleReset = () =>
    submit(
      { workshopId, resetToDefault: true },
      workshopId ? 'Đã bỏ hạn riêng, xưởng theo hạn chung.' : 'Đã đưa hạn về mặc định.',
    );

  if (weeksQuery.isError && !weeksQuery.data) {
    return <ErrorState error={weeksQuery.error} onRetry={() => weeksQuery.refetch()} />;
  }

  const overrideOf = (week: WorkWeek) => week.overrides.find((item) => item.workshopId === workshopId);

  const columns: TableColumnsType<WorkWeek> = [
    {
      title: 'Tuần',
      dataIndex: 'label',
      key: 'label',
      width: 300,
      render: (label: string, week) => (
        <span className={week.startDate <= dayjs().format('YYYY-MM-DD') && week.endDate >= dayjs().format('YYYY-MM-DD') ? 'font-semibold text-primary' : ''}>
          {label}
        </span>
      ),
    },
    {
      title: 'Hạn kế hoạch',
      key: 'plan',
      width: COLUMN_WIDTH.dateTime,
      render: (_, week) => formatDateTime(week.effectivePlanDeadlineAt),
    },
    {
      title: 'Hạn báo cáo',
      key: 'report',
      width: COLUMN_WIDTH.dateTime,
      render: (_, week) => formatDateTime(week.effectiveReportDeadlineAt),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      width: COLUMN_WIDTH.longText,
      render: (_, week) => (
        <div className="flex flex-wrap gap-1">
          {week.isDeadlineCustomized && <Tag color="blue">Hạn chung chỉnh tay</Tag>}
          {workshopId
            ? overrideOf(week) && <Tag color="orange">Hạn riêng xưởng</Tag>
            : week.overrides.length > 0 && (
                <Tooltip title={week.overrides.map((item) => item.workshopName ?? `#${item.workshopId}`).join(', ')}>
                  <Tag color="orange">{week.overrides.length} xưởng có hạn riêng</Tag>
                </Tooltip>
              )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, week) => (
        <Tooltip title="Sửa hạn">
          <Button
            type="text"
            aria-label={`Sửa hạn ${week.label}`}
            icon={<EditOutlined className="text-primary" />}
            onClick={() => {
              const deadlineOverride = overrideOf(week);
              form.setFieldsValue(
                workshopId
                  ? {
                      planDeadlineAt: deadlineOverride?.planDeadlineAt ? dayjs(deadlineOverride.planDeadlineAt) : null,
                      reportDeadlineAt: deadlineOverride?.reportDeadlineAt ? dayjs(deadlineOverride.reportDeadlineAt) : null,
                    }
                  : { planDeadlineAt: dayjs(week.planDeadlineAt), reportDeadlineAt: dayjs(week.reportDeadlineAt) },
              );
              setEditing(week);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Select
          aria-label="Năm"
          value={year}
          onChange={setYear}
          options={[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((value) => ({ value, label: `Năm ${value}` }))}
          className="w-32"
        />
        <Select
          aria-label="Xưởng"
          allowClear
          value={workshopId}
          onChange={setWorkshopId}
          options={workshops}
          placeholder="Hạn chung toàn nhà máy"
          showSearch
          optionFilterProp="label"
          className="w-full sm:w-80"
        />
      </div>
      <Typography.Text type="secondary">
        {workshopId
          ? `Đang xem hạn áp dụng cho ${workshopName}. Sửa = đặt hạn riêng của xưởng (để trống = theo hạn chung).`
          : 'Đang xem hạn chung toàn nhà máy. Chọn xưởng để đặt hạn riêng.'}
      </Typography.Text>
      <Table<WorkWeek>
        rowKey="id"
        size="small"
        bordered
        loading={weeksQuery.isFetching}
        columns={columns}
        dataSource={weeksQuery.data ?? []}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content', y: 520 }}
        className="[&_.ant-table-cell]:whitespace-nowrap"
      />

      <Modal
        open={editing !== undefined}
        title={editing ? `Hạn nộp – ${editing.label}${workshopName ? ` · ${workshopName}` : ''}` : 'Hạn nộp'}
        onCancel={() => setEditing(undefined)}
        mask={{ closable: false }}
        width={{ xs: '94%', sm: 520 }}
        centered
        forceRender
        footer={[
          <Button key="reset" onClick={handleReset} loading={updateMutation.isPending}>
            {workshopId ? 'Bỏ hạn riêng' : 'Về mặc định'}
          </Button>,
          <Button key="cancel" onClick={() => setEditing(undefined)}>
            Hủy
          </Button>,
          <Button key="save" type="primary" onClick={handleSave} loading={updateMutation.isPending}>
            Lưu hạn
          </Button>,
        ]}
      >
        <Form<DeadlineFormValues> form={form} layout="vertical" className="pt-1">
          {workshopId && (
            <Alert type="info" showIcon className="mb-3" title="Để trống ô nào thì ô đó theo hạn chung của tuần." />
          )}
          <Form.Item
            name="planDeadlineAt"
            label="Hạn khóa kế hoạch tuần này"
            rules={workshopId ? [] : [{ required: true, message: 'Chọn hạn kế hoạch' }]}
          >
            <DatePicker showTime={{ format: 'HH:mm', minuteStep: 5 }} format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>
          <Form.Item
            name="reportDeadlineAt"
            label="Hạn khóa báo cáo tuần này"
            rules={workshopId ? [] : [{ required: true, message: 'Chọn hạn báo cáo' }]}
            className="mb-0"
          >
            <DatePicker showTime={{ format: 'HH:mm', minuteStep: 5 }} format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
