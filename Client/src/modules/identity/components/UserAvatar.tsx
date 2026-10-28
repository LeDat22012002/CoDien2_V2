import { Avatar } from 'antd';

interface UserAvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  size?: number;
}

/** Chữ cái đầu của tên (từ cuối trong họ tên), giống hệ thống cũ. */
const getInitial = (fullName: string) => fullName.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? '?';

/** Ảnh đại diện; chưa có ảnh thì hiện chữ cái đầu của tên. */
export const UserAvatar = ({ fullName, avatarUrl, size = 32 }: UserAvatarProps) => (
  <Avatar size={size} src={avatarUrl || undefined} alt={fullName} className="shrink-0 bg-primary">
    {getInitial(fullName)}
  </Avatar>
);
