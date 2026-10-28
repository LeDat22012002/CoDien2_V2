import { SearchOutlined } from '@ant-design/icons';
import { Empty, Input, Skeleton, Tag } from 'antd';
import { useState } from 'react';
import { normalizeSearchText } from '@/modules/identity/constants/roleOptions';
import type { Role } from '@/modules/identity/types/roles';

interface RoleListPanelProps {
  roles: Role[];
  selectedId?: number;
  isLoading: boolean;
  onSelect: (roleId: number) => void;
}

/** Danh sách vai trò bên trái: tìm theo tên / mã, bấm để xem và phân quyền. */
export const RoleListPanel = ({ roles, selectedId, isLoading, onSelect }: RoleListPanelProps) => {
  const [keyword, setKeyword] = useState('');
  const normalizedKeyword = normalizeSearchText(keyword);
  const filtered = normalizedKeyword
    ? roles.filter((role) => normalizeSearchText(`${role.name} ${role.code}`).includes(normalizedKeyword))
    : roles;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Input
        allowClear
        aria-label="Tìm vai trò"
        prefix={<SearchOutlined className="text-text-secondary" aria-hidden />}
        placeholder="Tìm tên hoặc mã vai trò…"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : filtered.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có vai trò phù hợp" />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {filtered.map((role) => {
              const isSelected = role.id === selectedId;
              return (
                <li key={role.id}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelect(role.id)}
                    className={`w-full cursor-pointer rounded-md border px-3 py-2 text-left transition-colors duration-150 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent bg-transparent hover:bg-bg-layout'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {role.name}
                      </span>
                      {role.isSystem && (
                        <Tag color="red" className="me-0">
                          Hệ thống
                        </Tag>
                      )}
                      {!role.isActive && <Tag className="me-0">Ngừng</Tag>}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm text-text-secondary">
                      <span className="truncate font-mono">{role.code}</span>
                      <span className="shrink-0">
                        {role.userCount} người · {role.isSystem ? 'toàn quyền' : `${role.permissionCount} quyền`}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
