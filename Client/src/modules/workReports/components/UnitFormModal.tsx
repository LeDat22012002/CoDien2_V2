import { Alert, Form, Input, Modal, Radio, Select, Switch } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { LABOR_TYPE_OPTIONS } from '@/modules/workReports/constants/workReportOptions';
import {
  useCreateWorkReportUnit,
  useUnitParentOptions,
  useUpdateWorkReportUnit,
} from '@/modules/workReports/hooks/useWorkReportQueries';
import type { LaborType, WorkReportUnit } from '@/modules/workReports/types/workReports';

interface UnitFormValues {
  displayName?: string;
  parentOrgUnitId?: number;
  codePrefix: string;
  laborType: LaborType;
  isActive: boolean;
}

interface UnitFormModalProps {
  open: boolean;
  /** Có = sửa đơn vị; không = thêm đơn vị tự đặt vào xưởng workshopId. */
  unit?: WorkReportUnit;
  workshopId: number;
  onClose: () => void;
}

/**
 * Thêm đơn vị tự đặt (tên, gắn với xưởng hoặc 1 đội, tiền tố, loại giờ công) / sửa đơn vị (thêm bật/ngừng).
 * Tổ/kíp trên sơ đồ Server tự tạo nên không thêm ở đây. Lưu xong Server tự tạo / cập nhật form tuần đang chạy và tuần sau.
 */
export const UnitFormModal = ({ open, unit, workshopId, onClose }: UnitFormModalProps) => {
  const [form] = Form.useForm<UnitFormValues>();
  const createMutation = useCreateWorkReportUnit();
  const updateMutation = useUpdateWorkReportUnit();
  const isCreate = !unit;
  const parentOptionsQuery = useUnitParentOptions(workshopId, open && isCreate);
  const isNameRequired = isCreate || Boolean(unit?.isCustom);

  const handleSubmit = async () => {
    let values: UnitFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const base = {
      displayName: values.displayName?.trim() || null,
      codePrefix: values.codePrefix.trim().toUpperCase(),
      laborType: values.laborType,
    };

    try {
      if (unit) {
        await updateMutation.mutateAsync({ id: unit.id, request: { ...base, isActive: values.isActive } });
        notify.success('Đã lưu đơn vị báo cáo.');
      } else {
        await createMutation.mutateAsync({ ...base, parentOrgUnitId: values.parentOrgUnitId as number });
        notify.success(`Đã thêm "${base.displayName}". Hãy phân công kỹ sư phụ trách.`);
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={unit ? `Sửa đơn vị báo cáo – ${unit.displayName}` : 'Thêm đơn vị báo cáo'}
      okText={unit ? 'Lưu thay đổi' : 'Thêm đơn vị'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 560 }}
      centered
      destroyOnHidden
    >
      <Form<UnitFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        className="pt-1"
        initialValues={
          unit
            ? { displayName: unit.displayName, codePrefix: unit.codePrefix, laborType: unit.laborType, isActive: unit.isActive }
            : { parentOrgUnitId: workshopId, laborType: 'HC', isActive: true }
        }
      >
        {isCreate && (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title="Tổ/kíp có trên sơ đồ tổ chức đã tự có trong danh sách. Chỉ thêm ở đây đơn vị báo cáo không có trên sơ đồ."
          />
        )}
        <Form.Item
          name="displayName"
          label={isCreate ? 'Tên đơn vị' : 'Tên hiển thị'}
          tooltip={isNameRequired ? undefined : 'Để trống = lấy tên tổ/kíp trên sơ đồ tổ chức'}
          rules={[
            { required: isNameRequired, whitespace: true, message: 'Nhập tên đơn vị' },
            { max: 255, message: 'Tối đa 255 ký tự' },
          ]}
        >
          <Input placeholder={isCreate ? 'Vd: Tổ Cơ khí chung - Lò cao 5' : unit?.orgUnitName} />
        </Form.Item>
        {isCreate && (
          <Form.Item
            name="parentOrgUnitId"
            label="Thuộc"
            extra="Đội trưởng/phó của đội được chọn cùng quản lý và phân công kỹ sư cho đơn vị này."
            rules={[{ required: true, message: 'Chọn xưởng hoặc đội' }]}
          >
            <Select
              loading={parentOptionsQuery.isLoading}
              showSearch
              optionFilterProp="label"
              options={(parentOptionsQuery.data ?? []).map((option) => ({
                value: option.orgUnitId,
                label: option.isWorkshop ? `${option.name} (cả xưởng)` : option.name,
              }))}
            />
          </Form.Item>
        )}
        <Form.Item
          name="codePrefix"
          label="Tiền tố mã công việc"
          extra="Mã công việc = {Tiền tố}-{Hậu tố đầu mục}-{STT}, vd TCDKB-LV1-01. Duy nhất trong xưởng."
          rules={[
            { required: true, whitespace: true, message: 'Nhập tiền tố' },
            { max: 20, message: 'Tối đa 20 ký tự' },
            { pattern: /^[\p{L}\p{N}.-]+$/u, message: 'Chỉ gồm chữ, số, dấu chấm hoặc gạch ngang' },
          ]}
          normalize={(value?: string) => value?.toUpperCase()}
        >
          <Input className="font-mono" />
        </Form.Item>
        <Form.Item
          name="laborType"
          label="Loại giờ công"
          extra="Quyết định giờ công hiệu dụng/tuần dùng quy đổi nhân lực trên Tổng hợp."
          rules={[{ required: true, message: 'Chọn loại giờ công' }]}
        >
          <Radio.Group options={LABOR_TYPE_OPTIONS} optionType="button" buttonStyle="solid" />
        </Form.Item>
        {unit && (
          <Form.Item name="isActive" label="Đang dùng" valuePropName="checked" className="mb-0">
            <Switch checkedChildren="Dùng" unCheckedChildren="Ngừng" />
          </Form.Item>
        )}
        {unit && !unit.isOrgUnitActive && (
          <Alert
            type="warning"
            showIcon
            className="mt-3"
            title={`${unit.orgUnitName || 'Đơn vị gốc'} đã ngừng trên sơ đồ tổ chức, không bật lại được.`}
          />
        )}
      </Form>
    </Modal>
  );
};
