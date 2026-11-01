import { LockOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input } from 'antd';
import { setAccessToken } from '@/shared/api/axiosClient';
import { PageHeader } from '@/shared/components/PageHeader';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { changePassword } from '@/modules/identity/api/identityApi';
import { getConfirmPasswordRules, PASSWORD_RULES } from '@/modules/identity/constants/userOptions';

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Đổi mật khẩu của chính mình (route /member/change-password), như ResetPass hệ thống cũ.
 * Server đăng xuất mọi thiết bị khác và cấp phiên mới cho thiết bị đang dùng.
 */
const ChangePasswordPage = () => {
  const [form] = Form.useForm<ChangePasswordValues>();
  const mutation = useMutation({ mutationFn: changePassword });

  const handleFinish = async (values: ChangePasswordValues) => {
    try {
      const result = await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setAccessToken(result.accessToken);
      form.resetFields();
      notify.success('Đổi mật khẩu thành công.');
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Đổi mật khẩu" description="Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số." />

      <Card className="w-full max-w-md self-center">
        <Alert
          type="info"
          showIcon
          title="Sau khi đổi, các thiết bị khác đang đăng nhập tài khoản này sẽ phải đăng nhập lại."
          className="mb-4"
        />
        <Form<ChangePasswordValues> form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
          >
            <Input.Password prefix={<LockOutlined aria-hidden />} autoComplete="current-password" autoFocus />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            dependencies={['currentPassword']}
            rules={[
              ...PASSWORD_RULES,
              ({ getFieldValue }) => ({
                validator: (_, value?: string) =>
                  !value || value !== getFieldValue('currentPassword')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại')),
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined aria-hidden />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Nhập lại mật khẩu mới"
            dependencies={['newPassword']}
            rules={getConfirmPasswordRules('newPassword')}
          >
            <Input.Password prefix={<LockOutlined aria-hidden />} autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={mutation.isPending}>
            Đổi mật khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
