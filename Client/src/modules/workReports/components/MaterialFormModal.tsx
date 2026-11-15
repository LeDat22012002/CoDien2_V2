import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from '@/shared/utils/dayjs';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { toIsoDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { useMaterialPurposes, useSaveWorkMaterial } from '@/modules/workReports/hooks/useWorkReportQueries';
import type {
  WeeklyForm,
  WorkItem,
  WorkMaterial,
  WorkMaterialRequest,
  WorkReportPhase,
  WorkWeek,
} from '@/modules/workReports/types/workReports';

interface MaterialFormValues {
  workItemId: number;
  materialCode?: string;
  materialName: string;
  uom?: string;
  plannedQuantity?: number | null;
  actualQuantity?: number | null;
  usageDate?: Dayjs | null;
  materialPurposeId?: number | null;
  note?: string;
}

interface MaterialFormModalProps {
  open: boolean;
  form: WeeklyForm;
  phase: WorkReportPhase;
  week: WorkWeek;
  /** Có = sửa; không = thêm mới. */
  material?: WorkMaterial;
  onClose: () => void;
}

/**
 * Thêm / sửa vật tư gắn 1 dòng công việc. Kế hoạch nhập số lượng KH;
 * báo cáo nhập số lượng thực tế (trống = bằng KH), vật tư thêm ở báo cáo là vật tư phát sinh.
 */
export const MaterialFormModal = ({ open, form, phase, week, material, onClose }: MaterialFormModalProps) => {
  const [formInstance] = Form.useForm<MaterialFormValues>();
  const purposesQuery = useMaterialPurposes();
  const saveMutation = useSaveWorkMaterial();
  const isPlan = phase === 'PLAN';
  // Kế hoạch chỉ gắn được dòng kế hoạch
  const workItems: WorkItem[] = form.items.filter((item) => !isPlan || !item.isUnplanned);

  const handleSubmit = async () => {
    let values: MaterialFormValues;
    try {
      values = await formInstance.validateFields();
    } catch {
      return;
    }

    const request: WorkMaterialRequest = {
      workItemId: values.workItemId,
      materialCode: values.materialCode?.trim() || null,
      materialName: values.materialName.trim(),
      uom: values.uom?.trim() || null,
      plannedQuantity: values.plannedQuantity ?? null,
      actualQuantity: values.actualQuantity ?? null,
      usageDate: toIsoDate(values.usageDate) ?? null,
      materialPurposeId: values.materialPurposeId ?? null,
      note: values.note?.trim() || null,
    };

    try {
      if (material) {
        await saveMutation.mutateAsync({ mode: 'update', id: material.id, phase, request });
        notify.success('Đã lưu vật tư.');
      } else {
        await saveMutation.mutateAsync({ mode: 'create', formId: form.formId, phase, request });
        notify.success('Đã thêm vật tư.');
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(formInstance, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={material ? 'Sửa vật tư' : 'Thêm vật tư'}
      okText={material ? 'Lưu thay đổi' : 'Thêm vật tư'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={saveMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 720 }}
      centered
      destroyOnHidden
    >
      <Form<MaterialFormValues>
        form={formInstance}
        layout="vertical"
        preserve={false}
        className="pt-1"
        initialValues={
          material
            ? {
                workItemId: material.workItemId,
                materialCode: material.materialCode ?? undefined,
                materialName: material.materialName,
                uom: material.uom ?? undefined,
                plannedQuantity: material.plannedQuantity ?? null,
                actualQuantity: material.actualQuantity ?? null,
                usageDate: material.usageDate ? dayjs(material.usageDate) : null,
                materialPurposeId: material.materialPurposeId ?? null,
                note: material.note ?? undefined,
              }
            : undefined
        }
      >
        <Row gutter={12}>
          <Col xs={24}>
            <Form.Item
              name="workItemId"
              label="Mã công việc"
              rules={[{ required: true, message: 'Chọn dòng công việc dùng vật tư' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn mã công việc"
                options={workItems.map((item) => ({
                  value: item.id,
                  label: `${item.code} – ${item.description}`,
                }))}
                notFoundContent="Form chưa có dòng công việc"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="materialCode" label="Mã vật tư" rules={[{ max: 50, message: 'Tối đa 50 ký tự' }]}>
              <Input className="font-mono" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="materialName"
              label="Tên vật tư"
              rules={[
                { required: true, whitespace: true, message: 'Nhập tên vật tư' },
                { max: 255, message: 'Tối đa 255 ký tự' },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="uom" label="ĐVT" rules={[{ max: 20, message: 'Tối đa 20 ký tự' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            {isPlan ? (
              <Form.Item name="plannedQuantity" label="Số lượng KH">
                <InputNumber min={0} className="w-full" decimalSeparator="," />
              </Form.Item>
            ) : (
              <Form.Item
                name="actualQuantity"
                label="Số lượng thực tế"
                tooltip={material?.isUnplanned === false ? 'Để trống = bằng số lượng kế hoạch' : undefined}
              >
                <InputNumber min={0} className="w-full" decimalSeparator="," />
              </Form.Item>
            )}
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="usageDate" label="Ngày sử dụng">
              <DatePicker
                format="DD/MM/YYYY"
                className="w-full"
                minDate={dayjs(week.startDate)}
                maxDate={dayjs(week.endDate)}
                defaultPickerValue={dayjs(week.startDate)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="materialPurposeId" label="Mục đích">
              <Select
                allowClear
                loading={purposesQuery.isLoading}
                options={(purposesQuery.data ?? []).map((purpose) => ({ value: purpose.id, label: purpose.code }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="note" label="Ghi chú" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]} className="mb-0">
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
