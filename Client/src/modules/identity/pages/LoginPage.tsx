import {
  ArrowLeftOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Form, Input, Popover } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router";
import background from "@/assets/images/bg.svg";
import illustration from "@/assets/images/bg1.svg";
import logo from "@/assets/images/Logo.png";
import { LoadingOverlay } from "@/shared/components/LoadingOverlay";
import { applyServerErrors } from "@/shared/utils/formErrors";
import { notify } from "@/shared/utils/notify";
import { getSafeRedirect, REDIRECT_PARAM } from "@/shared/utils/redirect";
import type { LoginRequest } from "@/modules/identity/types/identity";
import { useLogin } from "@/modules/identity/hooks/useLogin";
import { useRememberedLogin } from "@/modules/identity/hooks/useRememberedLogin";

interface LoginFormValues extends LoginRequest {
  isRemembered: boolean;
}

const LOGO_ALT = "Hòa Phát Gang Thép";
/** Bấm đăng nhập sai nhiều lần liên tiếp chỉ giữ một toast lỗi. */
const LOGIN_ERROR_TOAST_ID = "login-error";

/** Cờ Việt Nam cạnh tiêu đề (chỉ hiển thị, app hiện chỉ có tiếng Việt). */
// const VietnamFlag = () => (
//   <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2" title="Tiếng Việt">
//     <svg viewBox="0 0 30 20" className="h-4 w-6 shrink-0 rounded-sm" aria-hidden="true">
//       <rect width="30" height="20" rx="2" fill="#DA251D" />
//       <path
//         fill="#FFFF00"
//         d="m15 4.6 1.76 5.42h5.7l-4.61 3.35 1.76 5.42L15 15.44l-4.61 3.35 1.76-5.42-4.61-3.35h5.7z"
//       />
//     </svg>
//     <span className="text-sm text-text-secondary">VI</span>
//   </div>
// );

/** Cột trái (≥ lg): logo, khẩu hiệu và hình minh họa. */
const BrandColumn = () => (
  <div className="hidden flex-col items-center justify-center lg:flex">
    <img src={logo} alt={LOGO_ALT} className="h-15 w-auto object-contain" />

    <h1 className="mt-5 text-center text-2xl leading-snug font-bold text-text-secondary xl:text-3xl">
      Không chỉ là một <span className="text-primary">GIẢI PHÁP QUẢN LÝ</span>
    </h1>
    <p className="mt-2 w-full max-w-120 text-right text-base text-accent">
      Làm việc mọi lúc mọi nơi
    </p>

    <img
      src={illustration}
      alt=""
      aria-hidden="true"
      className="mt-6 w-full max-w-140 object-contain"
    />
  </div>
);

/** Bố cục theo trang đăng nhập ERP: nền minh họa, cột thương hiệu bên trái, khung đăng nhập bên phải. */
const LoginPage = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutate: submitLogin, isPending } = useLogin();
  const { rememberedEmpCode, saveLogin } = useRememberedLogin();

  const handleSubmit = ({ isRemembered, ...request }: LoginFormValues) => {
    submitLogin(request, {
      onSuccess: () => {
        notify.dismiss(LOGIN_ERROR_TOAST_ID);
        void saveLogin(request, isRemembered);
        navigate(getSafeRedirect(searchParams.get(REDIRECT_PARAM)), {
          replace: true,
        });
      },
      onError: (loginError) => {
        applyServerErrors(form, loginError);
        notify.apiError(loginError, { toastId: LOGIN_ERROR_TOAST_ID });
      },
    });
  };

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-bg-container">
      <LoadingOverlay show={isPending} message="Đang đăng nhập..." />

      <img
        src={background}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-375 grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-4 lg:px-12">
        <BrandColumn />

        <div className="flex flex-col items-center justify-center">
          <img
            src={logo}
            alt={LOGO_ALT}
            className="mb-6 h-12 w-auto object-contain lg:hidden"
          />

          <div className="w-full max-w-125 rounded-xl bg-bg-container p-6 shadow-xl shadow-primary/15 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-text">Đăng nhập</h2>
              {/* <VietnamFlag /> */}
            </div>

            <Form<LoginFormValues>
              form={form}
              layout="vertical"
              size="large"
              requiredMark={false}
              disabled={isPending}
              initialValues={{
                empCode: rememberedEmpCode ?? "",
                isRemembered: Boolean(rememberedEmpCode),
              }}
              onFinish={handleSubmit}
            >
              <Form.Item
                label="Mã nhân viên"
                name="empCode"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Vui lòng nhập mã nhân viên.",
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-text-secondary" />}
                  placeholder="Mã nhân viên*"
                  autoComplete="username"
                  autoFocus={!rememberedEmpCode}
                />
              </Form.Item>

              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-text-secondary" />}
                  placeholder="Mật khẩu*"
                  autoComplete="current-password"
                  autoFocus={Boolean(rememberedEmpCode)}
                />
              </Form.Item>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <Form.Item name="isRemembered" valuePropName="checked" noStyle>
                  <Checkbox>Nhớ mật khẩu</Checkbox>
                </Form.Item>
                <Popover
                  content="Liên hệ quản trị viên để được đặt lại mật khẩu."
                  trigger="click"
                >
                  <Button type="link" className="h-11 px-0">
                    Quên mật khẩu?
                  </Button>
                </Popover>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isPending}
                className="h-13 font-semibold tracking-wide uppercase"
              >
                {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </Form>
          </div>

          <Link
            to="/"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-text-secondary hover:text-primary"
          >
            <ArrowLeftOutlined />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
