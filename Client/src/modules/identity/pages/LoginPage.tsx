import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router';
import { getErrorMessage } from '@/shared/api/axiosClient';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { getSafeRedirect, REDIRECT_PARAM } from '@/shared/utils/redirect';
import type { LoginRequest } from '@/modules/identity/api/identityApi';
import { useLogin } from '@/modules/identity/hooks/useLogin';

const LoginPage = () => {
  const [form] = Form.useForm<LoginRequest>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutate: submitLogin, isPending, error, reset } = useLogin();

  const handleSubmit = (values: LoginRequest) => {
    submitLogin(values, {
      onSuccess: () => navigate(getSafeRedirect(searchParams.get(REDIRECT_PARAM)), { replace: true }),
      onError: (loginError) => applyServerErrors(form, loginError),
    });
  };

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex flex-col justify-center bg-sider px-6 py-8 text-white lg:w-5/12 lg:px-12">
        <Typography.Text className="text-sm tracking-wide text-white/70 uppercase">
          Phần mềm nội bộ
        </Typography.Text>
        <Typography.Title level={2} className="mt-1 mb-0 text-white">
          Nhà máy Cơ điện 2
        </Typography.Title>
        <Typography.Paragraph className="mt-3 mb-0 hidden text-base text-white/80 lg:block">
          Quản lý thiết bị, sự cố, văn bản và cơ cấu tổ chức của nhà máy.
        </Typography.Paragraph>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <Card className="w-full max-w-md shadow-sm">
          <Typography.Title level={3} className="mb-1">
            Đăng nhập
          </Typography.Title>
          <Typography.Paragraph type="secondary">Dùng mã nhân viên và mật khẩu được cấp.</Typography.Paragraph>

          {error && (
            <Alert className="mb-4" type="error" showIcon title={getErrorMessage(error)} />
          )}

          <Form<LoginRequest>
            form={form}
            layout="vertical"
            size="large"
            requiredMark={false}
            disabled={isPending}
            onFinish={handleSubmit}
            onValuesChange={() => error && reset()}
          >
            <Form.Item
              label="Mã nhân viên"
              name="empCode"
              rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã nhân viên.' }]}
            >
              <Input prefix={<UserOutlined />} autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
            >
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={isPending}>
              Đăng nhập
            </Button>
          </Form>
        </Card>
      </main>
    </div>
  );
};

export default LoginPage;
