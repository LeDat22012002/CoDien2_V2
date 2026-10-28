import { Alert, AutoComplete, Col, Form, Input, Modal, Radio, Row, Select, Switch, TreeSelect } from 'antd';
import { useMemo, useRef } from 'react';
import { MENU_ICON_NAMES, getMenuIcon } from '@/shared/constants/menuIcons';
import { APP_ROUTE_PATHS } from '@/shared/constants/routes';
import { applyServerErrors } from '@/shared/utils/formErrors';
import { notify } from '@/shared/utils/notify';
import { getPermissionModuleLabel } from '@/modules/identity/constants/roleOptions';
import { useCreatePage, useUpdatePage } from '@/modules/identity/hooks/usePageQueries';
import type { Page, PageArea, PageRequest } from '@/modules/identity/types/pages';
import type { PermissionGroup } from '@/modules/identity/types/roles';
import {
  getNextSortOrder,
  getPageLinkType,
  getSelfAndDescendantIds,
  getSiblings,
  toPageCode,
  type PageLinkType,
} from '@/modules/identity/utils/pageTree';

interface PageFormValues {
  title: string;
  code: string;
  linkType: PageLinkType;
  path?: string;
  externalUrl?: string;
  icon?: string;
  parentId?: number;
  permissionId?: number;
  isMenu: boolean;
  isActive: boolean;
}

interface TreeSelectNode {
  value: number;
  title: string;
  disabled?: boolean;
  children?: TreeSelectNode[];
}

const PAGE_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PATH_PATTERN = /^\/[A-Za-z0-9/_:-]*$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;

const LINK_TYPE_OPTIONS: { value: PageLinkType; label: string }[] = [
  { value: 'path', label: 'Trang trong hệ thống' },
  { value: 'group', label: 'Nhóm menu' },
  { value: 'external', label: 'Liên kết ngoài' },
];

const ICON_OPTIONS = MENU_ICON_NAMES.map((name) => ({
  value: name,
  label: (
    <span className="inline-flex items-center gap-2">
      {getMenuIcon(name)}
      <span>{name}</span>
    </span>
  ),
}));

interface PageFormModalProps {
  open: boolean;
  /** Có = sửa trang này; không = thêm mới. */
  page?: Page;
  /** Thêm mới: trang cha mặc định (nhóm đang chọn). */
  defaultParentId?: number;
  area: PageArea;
  /** Cây đầy đủ (cả 2 menu) để chọn trang cha và tính thứ tự. */
  tree: Page[];
  permissionGroups: PermissionGroup[];
  onClose: () => void;
  onSaved: (page: Page) => void;
}

/** Thêm / sửa trang và mục menu. Trang cha chỉ chọn được nhóm menu cùng khu vực. */
export const PageFormModal = ({
  open,
  page,
  defaultParentId,
  area,
  tree,
  permissionGroups,
  onClose,
  onSaved,
}: PageFormModalProps) => {
  const [form] = Form.useForm<PageFormValues>();
  const isCreate = !page;
  // Người dùng đã tự sửa mã thì thôi tự sinh mã theo tiêu đề
  const isCodeTouched = useRef(false);
  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();

  const linkType = Form.useWatch('linkType', form) ?? (page ? getPageLinkType(page) : 'path');
  const path = Form.useWatch('path', form);
  const isAdmin = area === 'ADMIN';
  const isUnknownRoute = linkType === 'path' && PATH_PATTERN.test(path ?? '') &&
    !(APP_ROUTE_PATHS as readonly string[]).includes(path ?? '');

  // Trang cha: chỉ nhóm menu cùng khu vực, bỏ chính trang này và con cháu (tránh vòng lặp)
  const parentTree = useMemo(() => {
    const excluded = page ? getSelfAndDescendantIds(page) : new Set<number>();
    const build = (pages: Page[]): TreeSelectNode[] =>
      pages
        .filter((item) => getPageLinkType(item) === 'group' && !excluded.has(item.id))
        .map((item) => ({ value: item.id, title: item.title, children: build(item.children) }));
    return build(tree.filter((item) => item.area === area));
  }, [tree, area, page]);

  const permissionOptions = permissionGroups.map((group) => ({
    label: getPermissionModuleLabel(group.module),
    title: group.module,
    options: group.permissions.map((permission) => ({
      value: permission.id,
      label: `${permission.name} (${permission.code})`,
    })),
  }));

  const initialValues: PageFormValues = page
    ? {
        title: page.title,
        code: page.code,
        linkType: getPageLinkType(page),
        path: page.path ?? undefined,
        externalUrl: page.externalUrl ?? undefined,
        icon: page.icon ?? undefined,
        parentId: page.parentId ?? undefined,
        permissionId: page.permissionId ?? undefined,
        isMenu: page.isMenu,
        isActive: page.isActive,
      }
    : { title: '', code: '', linkType: 'path', parentId: defaultParentId, isMenu: true, isActive: true };

  const handleClose = () => {
    isCodeTouched.current = false;
    onClose();
  };

  const handleValuesChange = (changed: Partial<PageFormValues>) => {
    if ('code' in changed) isCodeTouched.current = true;
    if ('title' in changed && isCreate && !isCodeTouched.current) {
      form.setFieldValue('code', toPageCode(changed.title ?? ''));
    }
  };

  const handleSubmit = async () => {
    let values: PageFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const parentId = values.parentId ?? null;
    const isSameParent = page && (page.parentId ?? null) === parentId;
    const siblings = getSiblings(tree, area, parentId).filter((item) => item.id !== page?.id);
    const request: PageRequest = {
      code: values.code,
      title: values.title,
      path: values.linkType === 'path' ? values.path : undefined,
      externalUrl: values.linkType === 'external' ? values.externalUrl : undefined,
      icon: values.icon,
      parentId: values.parentId,
      area,
      // Nhóm menu và trang công khai không gắn quyền
      permissionId: isAdmin && values.linkType !== 'group' ? values.permissionId : undefined,
      sortOrder: isSameParent ? page.sortOrder : getNextSortOrder(siblings),
      isMenu: values.isMenu,
      isActive: values.isActive,
    };

    try {
      const saved = page
        ? await updateMutation.mutateAsync({ id: page.id, request })
        : await createMutation.mutateAsync(request);
      notify.success(page ? 'Cập nhật trang thành công.' : 'Thêm trang thành công.');
      onSaved(saved);
      handleClose();
    } catch (error) {
      if (!applyServerErrors(form, error)) notify.apiError(error);
    }
  };

  return (
    <Modal
      open={open}
      title={`${isCreate ? 'Thêm trang' : 'Sửa trang'} · ${isAdmin ? 'Menu quản trị' : 'Menu trang công khai'}`}
      okText={isCreate ? 'Thêm trang' : 'Lưu thay đổi'}
      cancelText="Hủy"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', md: 720 }}
      centered
      destroyOnHidden
    >
      <Form<PageFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
        className="pt-1"
      >
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Tiêu đề"
              rules={[
                { required: true, whitespace: true, message: 'Nhập tiêu đề' },
                { max: 100, message: 'Tối đa 100 ký tự' },
              ]}
            >
              <Input placeholder="VD: Phiếu nhập kho" autoFocus />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label="Mã trang"
              rules={[
                { required: true, message: 'Nhập mã trang' },
                { max: 50, message: 'Tối đa 50 ký tự' },
                { pattern: PAGE_CODE_PATTERN, message: 'Chữ thường không dấu, số, nối bằng "-"' },
              ]}
              extra={isCreate ? 'Tự sinh theo tiêu đề, có thể sửa.' : undefined}
            >
              <Input placeholder="VD: goods-receipts" className="font-mono" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item name="linkType" label="Loại">
              <Radio.Group optionType="button" buttonStyle="solid" options={LINK_TYPE_OPTIONS} />
            </Form.Item>
          </Col>

          {linkType === 'path' && (
            <Col span={24}>
              <Form.Item
                name="path"
                label="Đường dẫn"
                rules={[
                  { required: true, message: 'Nhập đường dẫn' },
                  { max: 200, message: 'Tối đa 200 ký tự' },
                  { pattern: PATH_PATTERN, message: 'Bắt đầu bằng "/", chỉ gồm chữ không dấu, số, "-", "_", "/", ":"' },
                ]}
                extra="Chọn từ danh sách màn hình đã có ở Client hoặc gõ đường dẫn."
              >
                <AutoComplete
                  options={APP_ROUTE_PATHS.map((route) => ({ value: route }))}
                  showSearch={{
                    filterOption: (input, option) =>
                      String(option?.value ?? '').toLowerCase().includes(input.toLowerCase()),
                  }}
                  placeholder="/admin/…"
                  className="font-mono"
                />
              </Form.Item>
              {isUnknownRoute && (
                <Alert
                  type="warning"
                  showIcon
                  className="-mt-2 mb-4"
                  title="Chưa có màn hình nào ở Client dùng đường dẫn này; bấm vào menu sẽ ra trang 404."
                />
              )}
            </Col>
          )}

          {linkType === 'external' && (
            <Col span={24}>
              <Form.Item
                name="externalUrl"
                label="Liên kết ngoài"
                rules={[
                  { required: true, message: 'Nhập liên kết' },
                  { max: 1000, message: 'Tối đa 1000 ký tự' },
                  { pattern: URL_PATTERN, message: 'Bắt đầu bằng http:// hoặc https://' },
                ]}
                extra="Mở ở tab mới."
              >
                <Input placeholder="https://…" inputMode="url" />
              </Form.Item>
            </Col>
          )}

          <Col xs={24} md={12}>
            <Form.Item name="parentId" label="Thuộc nhóm" extra="Bỏ trống = cấp gốc của menu.">
              <TreeSelect
                allowClear
                showSearch
                treeNodeFilterProp="title"
                treeData={parentTree}
                treeDefaultExpandAll
                placeholder="Cấp gốc"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="icon" label="Icon">
              <Select allowClear showSearch={{ optionFilterProp: 'value' }} options={ICON_OPTIONS} placeholder="Không có icon" />
            </Form.Item>
          </Col>

          {isAdmin && linkType !== 'group' && (
            <Col span={24}>
              <Form.Item
                name="permissionId"
                label="Quyền cần có để thấy trang"
                extra="Bỏ trống = ai đăng nhập cũng thấy. Người không có quyền sẽ không thấy menu và không vào được trang."
              >
                <Select
                  allowClear
                  showSearch={{ optionFilterProp: 'label' }}
                  options={permissionOptions}
                  placeholder="Không yêu cầu quyền"
                />
              </Form.Item>
            </Col>
          )}

          <Col xs={12} md={8}>
            <Form.Item name="isMenu" label="Hiện trên menu" valuePropName="checked">
              <Switch aria-label="Hiện trên menu" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="isActive" label="Hoạt động" valuePropName="checked">
              <Switch aria-label="Trang hoạt động" />
            </Form.Item>
          </Col>
        </Row>

        <div className="text-sm text-text-secondary">
          {isAdmin
            ? 'Ẩn khỏi menu: trang vẫn vào được bằng đường dẫn (vd trang chi tiết). Ngừng hoạt động: không hiện và không vào được.'
            : 'Menu công khai chỉ là liên kết điều hướng; quyền vào trang theo trang quản trị cùng đường dẫn.'}
        </div>
      </Form>
    </Modal>
  );
};
