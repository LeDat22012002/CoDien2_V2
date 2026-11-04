import { CameraOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Descriptions, Skeleton, Tag, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/shared/components/ErrorState';
import { StatusTag } from '@/shared/components/StatusTag';
import { LEVEL_TAG_COLOR } from '@/shared/constants/organization';
import { getPrimaryAssignment } from '@/shared/utils/assignmentRules';
import { toFileUrl } from '@/shared/utils/fileUrl';
import { EMPTY_TEXT, formatDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { useAuthStore } from '@/stores/authStore';
import { AvatarCropModal } from '@/modules/employees/components/AvatarCropModal';
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from '@/modules/employees/constants/employeeOptions';
import { useEmployeeDetail, useUploadMyAvatar } from '@/modules/employees/hooks/useEmployeeQueries';

const DESCRIPTION_LABEL_WIDTH = 160;
const AVATAR_SIZE = 200;
const DESCRIPTION_COLUMNS = { xs: 1, md: 2 };
const DESCRIPTION_STYLES = {
  label: { width: DESCRIPTION_LABEL_WIDTH, fontWeight: 600, fontSize: 15 },
  content: { fontSize: 15 },
};

const orEmpty = (value?: string | null) => value || EMPTY_TEXT;

/**
 * Thông tin nhân sự (route /member/profile), dựng lại theo DetailsMember hệ thống cũ:
 * - Cột trái: ảnh đại diện; chọn ảnh → cắt / phóng to → xem trước, bấm "Lưu" trên tiêu đề mới gửi lên.
 * - Cột phải: thông tin cá nhân, vị trí công tác (kèm xưởng), tài khoản.
 */
const MyProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const setUser = useAuthStore((state) => state.setUser);
  const detailQuery = useEmployeeDetail(user?.employeeId);
  const avatarMutation = useUploadMyAvatar();
  const employee = detailQuery.data;
  const position = getPrimaryAssignment(employee?.currentAssignments);

  // Ảnh vừa chọn đang cắt (mở modal) → ảnh đã cắt chờ lưu
  const [cropFile, setCropFile] = useState<File | null>(null);
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
    else setCropFile(file);
    return Upload.LIST_IGNORE;
  };

  const handleCropped = (file: File) => {
    replaceAvatar(file);
    setCropFile(null);
  };

  const handleSave = async () => {
    if (!avatarFile || !user) {
      notify.info('Không có thay đổi nào để lưu.');
      return;
    }
    try {
      const updated = await avatarMutation.mutateAsync(avatarFile);
      setUser({ ...user, avatarUrl: updated.avatarUrl });
      replaceAvatar(null);
      notify.success('Cập nhật ảnh đại diện thành công.');
    } catch (error) {
      notify.apiError(error);
    }
  };

  const renderDetail = () => {
    if (detailQuery.isPending) return <Skeleton active paragraph={{ rows: 10 }} />;
    if (detailQuery.isError) return <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} />;

    return (
      <div className="flex min-w-0 flex-col gap-8">
        <Descriptions
          title="Thông tin cá nhân"
          bordered
          column={DESCRIPTION_COLUMNS}
          styles={DESCRIPTION_STYLES}
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
              children: (
                <span className="break-all">
                  <MailOutlined aria-hidden /> {orEmpty(employee?.email)}
                </span>
              ),
            },
            {
              key: 'phone',
              label: 'Số điện thoại',
              children: (
                <span>
                  <PhoneOutlined aria-hidden /> {orEmpty(employee?.phone)}
                </span>
              ),
            },
          ]}
        />

        <Descriptions
          title="Vị trí công tác"
          bordered
          column={DESCRIPTION_COLUMNS}
          styles={DESCRIPTION_STYLES}
          items={[
            { key: 'jobTitle', label: 'Chức danh', span: 'filled', children: orEmpty(position?.jobTitle) },
            {
              key: 'level',
              label: 'Cấp bậc',
              children: position ? (
                <span className="inline-flex flex-wrap items-center gap-1">
                  {position.isActing && <Tag color="gold">Quyền</Tag>}
                  <Tag color={LEVEL_TAG_COLOR[position.levelCode]}>{position.levelName}</Tag>
                </span>
              ) : (
                EMPTY_TEXT
              ),
            },
            {
              key: 'unit',
              label: 'Đơn vị',
              children: position?.orgUnitName ?? <span className="italic">Chưa xếp vị trí</span>,
            },
            { key: 'workshop', label: 'Xưởng', span: 'filled', children: orEmpty(employee?.workshopName) },
          ]}
        />

        <Descriptions
          title="Tài khoản"
          bordered
          column={DESCRIPTION_COLUMNS}
          styles={DESCRIPTION_STYLES}
          items={[
            { key: 'userName', label: 'Tên tài khoản', children: <span className="font-mono">{user?.empCode}</span> },
            {
              key: 'roles',
              label: 'Quyền',
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
            {
              key: 'status',
              label: 'Trạng thái',
              span: 'filled',
              // Đang đăng nhập được nghĩa là tài khoản đang hoạt động
              children: <StatusTag status="running" label="Đang hoạt động" />,
            },
          ]}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <Card
        className="w-full rounded-xl shadow-lg"
        styles={{ body: { padding: 'clamp(16px, 3vw, 40px)' } }}
        title={<h2 className="m-0 py-2 text-2xl font-bold text-primary">Thông tin nhân sự</h2>}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={avatarMutation.isPending}
            disabled={!avatarFile}
            onClick={handleSave}
          >
            Lưu
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          {/* Cột trái: ảnh đại diện + tóm tắt */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <Avatar
                size={AVATAR_SIZE}
                src={avatarPreview ?? toFileUrl(user?.avatarUrl)}
                icon={<UserOutlined />}
                className="border-4 border-solid border-white shadow-xl"
              />
              <Upload accept={AVATAR_ACCEPT} showUploadList={false} beforeUpload={handlePickAvatar}>
                <Button
                  shape="circle"
                  size="large"
                  icon={<CameraOutlined />}
                  aria-label="Đổi ảnh đại diện"
                  title="Đổi ảnh đại diện"
                  className="absolute right-3 bottom-3 shadow"
                />
              </Upload>
            </div>
            {avatarFile && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm text-warning">Ảnh mới chưa lưu — bấm "Lưu"</span>
                <Button type="link" onClick={() => replaceAvatar(null)}>
                  Bỏ ảnh mới
                </Button>
              </div>
            )}
            <div className="text-2xl font-semibold text-primary">{user?.fullName}</div>
          </div>

          {/* Cột phải: chi tiết */}
          {renderDetail()}
        </div>
      </Card>

      <AvatarCropModal file={cropFile} onCancel={() => setCropFile(null)} onCropped={handleCropped} />
    </div>
  );
};

export default MyProfilePage;
