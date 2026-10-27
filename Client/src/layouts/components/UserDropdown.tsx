import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, type MenuProps } from "antd";
import { useNavigate } from "react-router";
import { useLogout } from "@/modules/identity/hooks/useLogout";
import { useAuthStore } from "@/stores/authStore";

interface UserDropdownProps {
  /** Trang công khai: đường dẫn vào trang quản trị. Bỏ trống thì không hiện mục "Trang quản trị". */
  adminPath?: string;
}

export const UserDropdown = ({ adminPath }: UserDropdownProps) => {
  const user = useAuthStore((state) => state.user);
  const handleLogout = useLogout();
  const navigate = useNavigate();

  const items: MenuProps["items"] = [
    {
      key: "profile",
      disabled: true,
      label: (
        <div className="flex flex-col">
          <span className="text-text-secondary">Thông tin cá nhân</span>
        </div>
      ),
    },
    { type: "divider" },
    ...(adminPath
      ? [
          {
            key: "admin",
            icon: <SettingOutlined />,
            label: "Trang quản trị",
            onClick: () => navigate(adminPath),
          },
        ]
      : []),
    {
      key: "logout",
      danger: true,
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      onClick: handleLogout,
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <Button
        type="text"
        shape="round"
        className="h-11 gap-2 px-2 sm:px-3"
        aria-label="Tài khoản"
      >
        <Avatar
          size={36}
          src={user?.avatarUrl || undefined}
          icon={<UserOutlined />}
          className="border border-border"
        />
        <span className="hidden max-w-48 truncate font-semibold sm:inline">
          {user?.fullName || "Người dùng"}
        </span>
      </Button>
    </Dropdown>
  );
};
