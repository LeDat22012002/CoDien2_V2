import { CameraOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Descriptions, Skeleton, Tag, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatusTag } from '@/shared/components/StatusTag';
import { LEVEL_TAG_COLOR } from '@/shared/constants/organization';
import { getPrimaryAssignment } from '@/shared/utils/assignmentRules';
import { EMPTY_TEXT, formatDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { useAuthStore } from '@/stores/authStore';
import { AssignmentHistoryTimeline } from '@/modules/employees/components/AssignmentHistoryTimeline';
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from '@/modules/employees/constants/employeeOptions';
import { useEmployeeDetail, useUploadMyAvatar } from '@/modules/employees/hooks/useEmployeeQueries';

const DESCRIPTION_LABEL_WIDTH = 140;

const orEmpty = (value?: string | null) => value || EMPTY_TEXT;

/**
 * Thông tin cá nhân (route /member/profile), như DetailsMember hệ thống cũ:
 * ảnh đại diện (đổi ảnh, bấm Lưu mới gửi), thông tin nhân viên, vị trí công tác, tài khoản, lịch sử công tác.
 */
const MyProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const setUser = useAuthStore((state) => state.setUser);
  const detailQuery = useEmployeeDetail(user?.employeeId);
  const avatarMutation = useUploadMyAvatar();
  const employee = detailQuery.data;
  const position = getPrimaryAssignment(employee?.currentAssignments);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const replaceAvatar = (file: File | null) => {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  // Đổi ảnh khác hoặc rời trang thì giải phóng ảnh xem trước cũ
  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  const handlePickAvatar = (file: File) => {
    if (file.size > AVATAR_MAX_BYTES) notify.warning('Ảnh tối đa 5MB.');
    else replaceAvatar(file);
    return Upload.LIST_IGNORE;
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile || !user) return;
    try {
      const updated = await avatarMutation.mutateAsync(avatarFile);
      setUser({ ...user, avatarUrl: updated.avatarUrl });
      replaceAvatar(null);
      notify.success('Đổi ảnh đại diện thành công.');
    } catch (error) {
      notify.apiError(error);
    }
  };

  const renderDetail = () => {
    if (detailQuery.isPending) return <Skeleton active paragraph={{ rows: 10 }} />;
    if (detailQuery.isError) return <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />;

    return (
      <div className="flex min-w-0 flex-col gap-6">
        <Descriptions
          title="Thông tin cá nhân"
          bordered
          size="small"
          column={{ xs: 1, md: 2 }}
          styles={{ label: { width: DESCRIPTION_LABEL_WIDTH, fontWeight: 600 } }}
          items={[
            { key: 'fullName', label: 'Họ tên', children: employee?.fullName },
            {
              key: 'empCode',
              label: 'Mã nhân viên',
              children: (
                <Tag icon={<IdcardOutlined />} color="blue">
                  {employee?.empCode}
                </Tag>
              ),
            },
            { key: 'gender', label: 'Giới tính', children: orEmpty(employee?.gender) },
            { key: 'birthDate', label: 'Ngày sinh', children: formatDate(employee?.birthDate) },
            { key: 'education', label: 'Trình độ', children: orEmpty(employee?.educationLevel) },
            { key: 'major', label: 'Chuyên ngành', children: orEmpty(employee?.major) },
            {
              key: 'email',
              label: 'Email',
              children: employee?.email ? (
                <span className="break-all">
                  <MailOutlined aria-hidden /> {employee.email}
                </span>
              ) : (
                EMPTY_TEXT
              ),
            },
            {
              key: 'phone',
              label: 'Số điện thoại',
              children: employee?.phone ? (
                <span>
                  <PhoneOutlined aria-hidden /> {employee.phone}
                </span>
              ) : (
                EMPTY_TEXT
              ),
            },
          ]}
        />

        <Descriptions
          title="Vị trí công tác"
          bordered
          size="small"
          column={{ xs: 1, md: 2 }}
          styles={{ label: { width: DESCRIPTION_LABEL_WIDTH, fontWeight: 600 } }}
          items={
            position
              ? [
                  { key: 'jobTitle', label: 'Chức danh', span: 'filled', children: orEmpty(position.jobTitle) },
                  {
                    key: 'level',
                    label: 'Cấp bậc',
                    children: (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        {position.isActing && <Tag color="gold">Quyền</Tag>}
                        <Tag color={LEVEL_TAG_COLOR[position.levelCode]}>{position.levelName}</Tag>
                      </span>
                    ),
                  },
                  { key: 'unit', label: 'Đơn vị', children: position.orgUnitName },
                  { key: 'startDate', label: 'Từ ngày', children: formatDate(position.startDate) },
                ]
              : [{ key: 'none', label: 'Vị trí', children: <span className="italic">Chưa xếp vị trí</span> }]
          }
        />

        <Descriptions
          title="Tài khoản"
          bordered
          size="small"
          column={{ xs: 1, md: 2 }}
          styles={{ label: { width: DESCRIPTION_LABEL_WIDTH, fontWeight: 600 } }}
          items={[
            { key: 'userName', label: 'Tên đăng nhập', children: <span className="font-mono">{user?.empCode}</span> },
            {
              key: 'status',
              label: 'Trạng thái',
              children:
                employee?.status === 'ACTIVE' ? (
                  <StatusTag status="running" label="Đang làm việc" />
                ) : (
                  <StatusTag status="stopped" label="Đã nghỉ" />
                ),
            },
            {
              key: 'roles',
              label: 'Vai trò',
              span: 'filled',
              children: roles.length ? (
                <span className="inline-flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <Tag key={role.id} color={role.code === 'SUPER_ADMIN' ? 'red' : 'purple'} className="me-0">
                      {role.name}
                    </Tag>
                  ))}
                </span>
              ) : (
                EMPTY_TEXT
              ),
            },
          ]}
        />

        <div>
          <div className="mb-2 text-base font-semibold">Lịch sử công tác</div>
          <AssignmentHistoryTimeline empCode={employee?.empCode} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="Thông tin cá nhân" description="Thông tin nhân sự, vị trí công tác và tài khoản của bạn." />

      <Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          {/* Cột trái: ảnh đại diện */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <Avatar
                size={160}
                src={avatarPreview ?? user?.avatarUrl ?? undefined}
                icon={<UserOutlined />}
                className="border-4 border-solid border-white shadow-lg"
              />
              <Upload accept={AVATAR_ACCEPT} showUploadList={false} beforeUpload={handlePickAvatar}>
                <Button
                  shape="circle"
                  icon={<CameraOutlined />}
                  aria-label="Chọn ảnh đại diện mới"
                  className="absolute right-2 bottom-2 shadow"
                />
              </Upload>
            </div>
            <div className="text-lg font-semibold text-primary">{user?.fullName}</div>

            {avatarFile && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-text-secondary">Ảnh mới chưa lưu</span>
                <div className="flex gap-2">
                  <Button onClick={() => replaceAvatar(null)}>Bỏ chọn</Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={avatarMutation.isPending}
                    onClick={handleSaveAvatar}
                  >
                    Lưu ảnh
                  </Button>
                </div>
              </div>
            )}
            <span className="text-xs text-text-secondary">PNG, JPG, WEBP, GIF · tối đa 5MB</span>
          </div>

          {/* Cột phải: chi tiết */}
          {renderDetail()}
        </div>
      </Card>
    </div>
  );
};

export default MyProfilePage;
