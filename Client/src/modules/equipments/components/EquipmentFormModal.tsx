import { Form, Input, Modal } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { useCreateEquipment, useUpdateEquipment } from '@/modules/equipments/hooks/useEquipmentQueries';
import type { Equipment, EquipmentRequest } from '@/modules/equipments/types/equipments';

interface EquipmentFormValues {
  code: string;
  name?: string;
}

interface EquipmentFormModalProps {
  open: boolean;
  /** Có = sửa thiết bị này; không = thêm mới. Giữ lại khi đóng để nội dung không chớp. */
  equipment?: Equipment;
  onClose: () => void;
}

const toRequest = (values: EquipmentFormValues): EquipmentRequest => ({
  code: values.code.trim(),
  name: values.name?.trim() || undefined,
});

/** Thêm / sửa thiết bị trong danh mục (mã duy nhất, Server kiểm tra trùng). */
export const EquipmentFormModal = ({ open, equipment, onClose }: EquipmentFormModalProps) => {
  const [form] = Form.useForm<EquipmentFormValues>();
  const isCreate = !equipment;
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();

  const handleSubmit = async () => {
    let values: EquipmentFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      if (equipment) {
        await updateMutation.mutateAsync({ id: equipment.id, request: toRequest(values) });
        notify.success('Cập nhật thiết bị thành công.');
      } else {
        await createMutation.mutateAsync(toRequest(values));
        notify.success('Thêm thiết bị thành công.');
      }
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={isCreate ? 'Thêm thiết bị' : 'Sửa thiết bị'}
      okText={isCreate ? 'Thêm thiết bị' : 'Lưu thay đổi'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 560 }}
      centered
      destroyOnHidden
    >
      <Form<EquipmentFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        className="pt-1"
        initialValues={equipment ? { code: equipment.code, name: equipment.name ?? undefined } : undefined}
      >
        <Form.Item
          name="code"
          label="Mã Equipment"
          rules={[
            { required: true, whitespace: true, message: 'Nhập mã thiết bị' },
            { max: 50, message: 'Tối đa 50 ký tự' },
          ]}
        >
          <Input placeholder="VD: 1-T03-XNH-03-1" className="font-mono" autoFocus />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên thiết bị"
          rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
          className="mb-0"
        >
          <Input placeholder="Tên theo Equipment" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
