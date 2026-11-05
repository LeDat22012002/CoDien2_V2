import {
  IdcardOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Dropdown, type MenuProps } from "antd";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { MEMBER_PROFILE_PATH } from "@/shared/constants/routes";
import { toFileUrl } from "@/shared/utils/fileUrl";
import { useLogout } from "@/modules/identity/hooks/useLogout";
import { collectMenuLeaves } from "@/layouts/utils/menuItems";
import { useAuthStore } from "@/stores/authStore";

/** Trang đầu tiên của menu (bỏ "/" vì "/" chỉ chuyển về trang công khai mặc định). */
const useFirstMenuPath = (area: "admin" | "member") => {
  const menu = useAuthStore((state) =>
    area === "member" ? state.memberMenu : state.menu,
  );
  return useMemo(
    () => collectMenuLeaves(menu).find((leaf) => leaf.path !== "/")?.path,
    [menu],
  );
};

/**
 * Avatar + tên người dùng ở header; menu: thông tin cá nhân, chuyển qua lại trang cá nhân / trang quản trị
 * (chỉ hiện khu vực khác với trang đang xem và khi user có ít nhất 1 trang trong đó), đăng xuất.
 */
export const UserDropdown = () => {
  const user = useAuthStore((state) => state.user);
  const handleLogout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAdminArea = pathname.startsWith("/admin");
  const adminPath = useFirstMenuPath("admin");

  const items: MenuProps["items"] = [
    {
      key: "profile",
      icon: <IdcardOutlined />,
      label: "Trang cá nhân",
      onClick: () => navigate(MEMBER_PROFILE_PATH),
    },

    ...(adminPath && !isAdminArea
      ? [
          {
            key: "admin",
            icon: <SettingOutlined />,
            label: "Trang quản trị",
            onClick: () => navigate(adminPath),
          },
        ]
      : []),
    { type: "divider" as const },
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
          src={toFileUrl(user?.avatarUrl)}
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
