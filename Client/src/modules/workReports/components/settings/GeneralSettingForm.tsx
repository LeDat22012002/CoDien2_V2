import { SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Form, InputNumber, Row, Select, Skeleton, TimePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import { ErrorState } from '@/shared/components/ErrorState';
import dayjs from '@/shared/utils/dayjs';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { useUpdateWorkReportSetting, useWorkReportSetting } from '@/modules/workReports/hooks/useWorkReportQueries';

interface SettingFormValues {
  hcMinutesPerWeek: number;
  shiftMinutesPerWeek: number;
  deadlineDayOffset: number;
  deadlineTime: Dayjs;
  warnDaysBefore: number;
}

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

/** 0 = thứ 2 cùng tuần … 13 = Chủ nhật tuần sau. */
const DEADLINE_DAY_OPTIONS = Array.from({ length: 14 }, (_, offset) => ({
  value: offset,
  label: `${DAY_NAMES[offset % 7]} ${offset >= 7 ? 'tuần sau' : 'cùng tuần'}`,
}));

/** "HH:mm:ss" (TimeOnly của Server) → Dayjs hôm nay giờ đó. */
const toTime = (value: string) => {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return dayjs().hour(hour).minute(minute).second(0);
};

/**
 * Cấu hình chung: giờ công hiệu dụng/tuần (HC, KIP) để quy đổi nhân lực, hạn nộp mặc định, số ngày cảnh báo.
 * Đổi hạn mặc định chỉ tính lại hạn chưa tới của tuần chưa chỉnh tay; giờ công mới áp dụng cho form chưa khóa.
 */
export const GeneralSettingForm = () => {
  const [form] = Form.useForm<SettingFormValues>();
  const settingQuery = useWorkReportSetting();
  const updateMutation = useUpdateWorkReportSetting();

  if (settingQuery.isLoading) return <Skeleton active />;
  if (settingQuery.isError || !settingQuery.data) {
    return <ErrorState error={settingQuery.error} onRetry={() => settingQuery.refetch()} />;
  }

  const setting = settingQuery.data;

  const handleSubmit = async (values: SettingFormValues) => {
    try {
      await updateMutation.mutateAsync({
        hcMinutesPerWeek: values.hcMinutesPerWeek,
        shiftMinutesPerWeek: values.shiftMinutesPerWeek,
        deadlineDayOffset: values.deadlineDayOffset,
        deadlineTime: values.deadlineTime.format('HH:mm:00'),
        warnDaysBefore: values.warnDaysBefore,
      });
      notify.success('Đã lưu cấu hình.');
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Form<SettingFormValues>
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      className="max-w-3xl"
      initialValues={{
        hcMinutesPerWeek: setting.hcMinutesPerWeek,
        shiftMinutesPerWeek: setting.shiftMinutesPerWeek,
        deadlineDayOffset: setting.deadlineDayOffset,
        deadlineTime: toTime(setting.deadlineTime),
        warnDaysBefore: setting.warnDaysBefore,
      }}
    >
      <Alert type="info" showIcon className="mb-4" title={setting.deadlineDescription} />
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="hcMinutesPerWeek"
            label="Giờ công hiệu dụng HC (phút/tuần)"
            extra="Mặc định 7,5 × 60 × 6 = 2.700"
            rules={[{ required: true, message: 'Nhập giờ công' }]}
          >
            <InputNumber min={1} max={10080} className="w-full" decimalSeparator="," />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="shiftMinutesPerWeek"
            label="Giờ công hiệu dụng KIP (phút/tuần)"
            extra="Mặc định ((2×10×7/3 × 4,33) − 24) / 4,33 × 60 ≈ 2.467,44"
            rules={[{ required: true, message: 'Nhập giờ công' }]}
          >
            <InputNumber min={1} max={10080} className="w-full" decimalSeparator="," />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name="deadlineDayOffset"
            label="Ngày hạn báo cáo tuần N"
            extra="Kế hoạch tuần N+1 khóa cùng lúc"
            rules={[{ required: true, message: 'Chọn ngày hạn' }]}
          >
            <Select options={DEADLINE_DAY_OPTIONS} />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item name="deadlineTime" label="Giờ khóa" rules={[{ required: true, message: 'Chọn giờ' }]}>
            <TimePicker format="HH:mm" minuteStep={5} className="w-full" allowClear={false} />
          </Form.Item>
        </Col>
        <Col xs={12} md={8}>
          <Form.Item name="warnDaysBefore" label="Cảnh báo trước (ngày)" rules={[{ required: true, message: 'Nhập số ngày' }]}>
            <InputNumber min={0} max={6} className="w-full" />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending}>
        Lưu cấu hình
      </Button>
    </Form>
  );
};
