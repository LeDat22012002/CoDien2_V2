import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, type MenuProps } from 'antd';
import { useLogout } from '@/modules/identity/hooks/useLogout';
import { useAuthStore } from '@/stores/authStore';

export const UserDropdown = () => {
  const user = useAuthStore((state) => state.user);
  const handleLogout = useLogout();

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      disabled: true,
      label: (
        <div className="flex flex-col">
          <span className="font-medium text-text">{user?.fullName}</span>
          <span className="text-text-secondary">Mã NV: {user?.empCode}</span>
        </div>
      ),
    },
    { type: 'divider' },
    { key: 'logout', danger: true, icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Button type="text" className="h-11 px-2" aria-label="Tài khoản">
        <Avatar size="small" src={user?.avatarUrl || undefined} icon={<UserOutlined />} />
        <span className="hidden max-w-48 truncate sm:inline">{user?.fullName}</span>
      </Button>
    </Dropdown>
  );
};
