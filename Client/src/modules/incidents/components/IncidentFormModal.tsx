import { DatePicker, Form, Input, InputNumber, Modal, Select, Spin, Switch, type FormRule } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import dayjs from '@/shared/utils/dayjs';
import { DATE_TIME_FORMAT } from '@/shared/utils/format';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import {
  INCIDENT_TYPE_OPTIONS,
  SHIFT_OPTIONS,
  STOP_LEVEL_OPTIONS,
} from '@/modules/incidents/constants/incidentOptions';
import { useCreateIncident, useEquipmentOptions } from '@/modules/incidents/hooks/useIncidentQueries';
import type { IncidentWorkshop } from '@/modules/incidents/types/incidents';

/** Tên field trùng tên trong request để gắn lỗi validate từ Server vào đúng ô. */
interface IncidentFormValues {
  shift: string;
  workshopId: number;
  equipmentCode: string;
  equipmentName: string;
  deviceName: string;
  receivedAt: Dayjs;
  repairStartedAt: Dayjs;
  repairFinishedAt: Dayjs;
  handedOverAt: Dayjs;
  incidentType: string;
  stopLevel: string;
  affectsProduction: boolean;
  result?: number | null;
  description: string;
  solution: string;
  note?: string;
}

type MilestoneField = 'receivedAt' | 'repairStartedAt' | 'repairFinishedAt' | 'handedOverAt';

interface IncidentFormModalProps {
  open: boolean;
  workshops: IncidentWorkshop[];
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;
/** Giờ địa phương không kèm múi giờ, Server lưu nguyên giá trị (như hệ thống cũ). */
const LOCAL_DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

const toLocalDateTime = (value?: Dayjs | null) => value?.format(LOCAL_DATE_TIME_FORMAT);
const trimOrUndefined = (value?: string) => value?.trim() || undefined;

/** Mốc sau không được nhỏ hơn mốc trước (nhận thông tin ≤ bắt đầu sửa ≤ sửa xong ≤ bàn giao). */
const notBefore =
  (previousField: MilestoneField, message: string): FormRule =>
  ({ getFieldValue }) => ({
    validator: (_, value?: Dayjs | null) => {
      const previous = getFieldValue(previousField) as Dayjs | null | undefined;
      return !value || !previous || !value.isBefore(previous)
        ? Promise.resolve()
        : Promise.reject(new Error(message));
    },
  });

const MILESTONES: { name: MilestoneField; label: string; requiredMessage: string; previous?: MilestoneField; orderMessage?: string }[] = [
  { name: 'receivedAt', label: 'Thời điểm nhận thông tin', requiredMessage: 'Chọn thời điểm nhận thông tin' },
  {
    name: 'repairStartedAt',
    label: 'Bắt đầu sửa chữa',
    requiredMessage: 'Chọn thời điểm bắt đầu sửa chữa',
    previous: 'receivedAt',
    orderMessage: 'Không được nhỏ hơn thời điểm nhận thông tin',
  },
  {
    name: 'repairFinishedAt',
    label: 'Sửa chữa xong',
    requiredMessage: 'Chọn thời điểm sửa chữa xong',
    previous: 'repairStartedAt',
    orderMessage: 'Không được nhỏ hơn thời điểm bắt đầu sửa chữa',
  },
  {
    name: 'handedOverAt',
    label: 'Bàn giao',
    requiredMessage: 'Chọn thời điểm bàn giao',
    previous: 'repairFinishedAt',
    orderMessage: 'Không được nhỏ hơn thời điểm sửa chữa xong',
  },
];

/**
 * Thêm báo cáo sự cố (BaoCaoSuCoModal hệ thống cũ). Người nhập và thời điểm nhập Server lấy theo tài khoản đăng nhập.
 * Danh mục thiết bị rất lớn nên tìm theo từ khóa người dùng gõ; chọn mã thì tự điền tên theo danh mục.
 */
export const IncidentFormModal = ({ open, workshops, onClose }: IncidentFormModalProps) => {
  const [form] = Form.useForm<IncidentFormValues>();
  const createMutation = useCreateIncident();
  const [equipmentKeyword, setEquipmentKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(equipmentKeyword.trim(), SEARCH_DEBOUNCE_MS);
  const equipmentQuery = useEquipmentOptions(debouncedKeyword, open);

  const equipmentOptions = (equipmentQuery.data ?? []).map((equipment) => ({
    label: equipment.name ? `${equipment.code} - ${equipment.name}` : equipment.code,
    value: equipment.code,
    name: equipment.name ?? '',
  }));

  const handleSubmit = async () => {
    let values: IncidentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await createMutation.mutateAsync({
        shift: values.shift,
        workshopId: values.workshopId,
        equipmentCode: values.equipmentCode,
        equipmentName: values.equipmentName,
        deviceName: trimOrUndefined(values.deviceName),
        receivedAt: toLocalDateTime(values.receivedAt),
        repairStartedAt: toLocalDateTime(values.repairStartedAt),
        repairFinishedAt: toLocalDateTime(values.repairFinishedAt),
        handedOverAt: toLocalDateTime(values.handedOverAt),
        incidentType: values.incidentType,
        stopLevel: values.stopLevel,
        affectsProduction: values.affectsProduction,
        description: trimOrUndefined(values.description),
        solution: trimOrUndefined(values.solution),
        result: values.result ?? undefined,
        note: trimOrUndefined(values.note),
      });
      notify.success('Thêm báo cáo sự cố thành công.');
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title="Thêm mới báo cáo sự cố"
      okText="Thêm mới"
      cancelText="Đóng"
      onOk={handleSubmit}
      onCancel={onClose}
      afterClose={() => setEquipmentKeyword('')}
      confirmLoading={createMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 900 }}
      centered
      destroyOnHidden
    >
      <Form<IncidentFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        className="pt-1"
        initialValues={{ affectsProduction: false, receivedAt: dayjs() }}
      >
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
          <Form.Item name="shift" label="Kíp" rules={[{ required: true, message: 'Chọn kíp' }]}>
            <Select placeholder="Chọn kíp" options={SHIFT_OPTIONS} />
          </Form.Item>
          <Form.Item name="workshopId" label="Xưởng" rules={[{ required: true, message: 'Chọn xưởng' }]}>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="Chọn xưởng"
              options={workshops.map((workshop) => ({ label: workshop.name, value: workshop.id }))}
            />
          </Form.Item>
          <Form.Item name="equipmentCode" label="Mã thiết bị" rules={[{ required: true, message: 'Chọn mã thiết bị' }]}>
            <Select
              showSearch={{ filterOption: false, onSearch: setEquipmentKeyword }}
              placeholder="Gõ để tìm mã thiết bị"
              options={equipmentOptions}
              onSelect={(_, option) => form.setFieldValue('equipmentName', option.name)}
              notFoundContent={equipmentQuery.isFetching ? <Spin size="small" /> : 'Không tìm thấy thiết bị'}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item name="equipmentName" label="Tên thiết bị (theo danh mục)">
            <Input disabled placeholder="Tự điền theo mã thiết bị" />
          </Form.Item>
          <Form.Item
            name="deviceName"
            label="Tên sự cố"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên sự cố' },
              { max: 255, message: 'Tối đa 255 ký tự' },
            ]}
          >
            <Input placeholder="Nhập tên sự cố" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 md:grid-cols-4">
          {MILESTONES.map((milestone) => (
            <Form.Item
              key={milestone.name}
              name={milestone.name}
              label={milestone.label}
              dependencies={milestone.previous ? [milestone.previous] : undefined}
              rules={[
                { required: true, message: milestone.requiredMessage },
                ...(milestone.previous && milestone.orderMessage
                  ? [notBefore(milestone.previous, milestone.orderMessage)]
                  : []),
              ]}
            >
              <DatePicker showTime={{ format: 'HH:mm' }} format={DATE_TIME_FORMAT} className="w-full" />
            </Form.Item>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-4 md:grid-cols-[2fr_2fr_1fr_1fr]">
          <Form.Item name="incidentType" label="Loại sự cố" rules={[{ required: true, message: 'Chọn loại sự cố' }]}>
            <Select placeholder="Chọn loại sự cố" options={INCIDENT_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="stopLevel" label="Dừng đến cấp" rules={[{ required: true, message: 'Chọn mức dừng' }]}>
            <Select placeholder="Chọn mức dừng" options={STOP_LEVEL_OPTIONS} />
          </Form.Item>
          <Form.Item name="affectsProduction" label="Ảnh hưởng SX" valuePropName="checked">
            <Switch checkedChildren="Có" unCheckedChildren="Không" aria-label="Ảnh hưởng sản xuất" />
          </Form.Item>
          <Form.Item name="result" label="Kết quả">
            <InputNumber min={0} max={100} placeholder="0" suffix="%" className="w-full" />
          </Form.Item>
        </div>

        <Form.Item
          name="description"
          label="Mô tả sự cố"
          rules={[
            { required: true, whitespace: true, message: 'Mô tả chi tiết sự cố' },
            { max: 4000, message: 'Tối đa 4000 ký tự' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="Mô tả chi tiết sự cố, phỏng đoán nguyên nhân" />
        </Form.Item>
        <Form.Item
          name="solution"
          label="Phương án xử lý"
          rules={[
            { required: true, whitespace: true, message: 'Nhập phương án xử lý' },
            { max: 4000, message: 'Tối đa 4000 ký tự' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="Phương án đã áp dụng / khắc phục tạm thời" />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú" rules={[{ max: 4000, message: 'Tối đa 4000 ký tự' }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
