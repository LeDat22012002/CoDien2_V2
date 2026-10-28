import { Form, Input, Modal } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { ROLE_CODE_PATTERN } from '@/modules/identity/constants/roleOptions';
import { useCreateRole } from '@/modules/identity/hooks/useRoleQueries';
import type { RoleDetail } from '@/modules/identity/types/roles';

interface RoleCreateFormValues {
  code: string;
  name: string;
  description?: string;
}

interface RoleCreateModalProps {
  open: boolean;
  onClose: () => void;
  /** Tạo xong: chọn luôn vai trò mới để phân quyền. */
  onCreated: (role: RoleDetail) => void;
}

/** Thêm vai trò (chưa có quyền); phân quyền ở khung chi tiết sau khi tạo. */
export const RoleCreateModal = ({ open, onClose, onCreated }: RoleCreateModalProps) => {
  const [form] = Form.useForm<RoleCreateFormValues>();
  const createMutation = useCreateRole();

  const handleSubmit = async () => {
    let values: RoleCreateFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        code: values.code,
        name: values.name,
        description: values.description,
        isActive: true,
        permissionIds: [],
      });
      notify.success('Đã thêm vai trò. Hãy chọn quyền cho vai trò mới.');
      onCreated(created);
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title="Thêm vai trò"
      okText="Thêm vai trò"
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 480 }}
      centered
      destroyOnHidden
    >
      <Form<RoleCreateFormValues> form={form} layout="vertical" preserve={false} className="pt-1">
        <Form.Item
          name="code"
          label="Mã vai trò"
          normalize={(value?: string) => value?.toUpperCase().replace(/\s+/g, '_')}
          rules={[
            { required: true, message: 'Nhập mã vai trò' },
            {
              pattern: ROLE_CODE_PATTERN,
              message: '2–50 ký tự: chữ in hoa không dấu, số, "_", bắt đầu bằng chữ',
            },
          ]}
          extra="Không đổi được sau khi tạo. VD: VAN_THU, KY_THUAT"
        >
          <Input placeholder="VD: VAN_THU" className="font-mono" autoFocus />
        </Form.Item>
        <Form.Item
          name="name"
          label="Tên vai trò"
          rules={[
            { required: true, whitespace: true, message: 'Nhập tên vai trò' },
            { max: 100, message: 'Tối đa 100 ký tự' },
          ]}
        >
          <Input placeholder="VD: Văn thư" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
          <Input.TextArea rows={2} maxLength={500} placeholder="Vai trò dành cho ai, dùng làm gì…" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
