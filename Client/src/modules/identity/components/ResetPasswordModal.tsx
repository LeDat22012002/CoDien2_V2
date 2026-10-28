import { Form, Input, Modal } from 'antd';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { PASSWORD_RULES, getConfirmPasswordRules } from '@/modules/identity/constants/userOptions';
import { useResetUserPassword } from '@/modules/identity/hooks/useUserQueries';
import type { User } from '@/modules/identity/types/users';

interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordModalProps {
  /** null = đóng. */
  user: User | null;
  onClose: () => void;
}

/** Đặt lại mật khẩu: mở khóa luôn và đăng xuất mọi phiên của tài khoản. */
export const ResetPasswordModal = ({ user, onClose }: ResetPasswordModalProps) => {
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const resetMutation = useResetUserPassword();

  const handleSubmit = async () => {
    if (!user) return;
    let values: ResetPasswordFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      await resetMutation.mutateAsync({ id: user.id, newPassword: values.newPassword });
      notify.success(`Đã đặt lại mật khẩu cho ${user.fullName}.`);
      onClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      title="Đặt lại mật khẩu"
      okText="Đặt lại"
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={resetMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 440 }}
      centered
      destroyOnHidden
    >
      <p className="mb-3 text-sm text-text-secondary">
        Tài khoản <b className="text-text">{user?.fullName}</b> ({user?.empCode}) sẽ bị đăng xuất khỏi mọi thiết bị và
        được mở khóa nếu đang bị khóa tạm.
      </p>
      <Form<ResetPasswordFormValues> form={form} layout="vertical" preserve={false}>
        <Form.Item name="newPassword" label="Mật khẩu mới" rules={PASSWORD_RULES} hasFeedback>
          <Input.Password autoComplete="new-password" placeholder="Tối thiểu 8 ký tự, có chữ và số" autoFocus />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Nhập lại mật khẩu mới"
          dependencies={['newPassword']}
          rules={getConfirmPasswordRules('newPassword')}
          hasFeedback
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
