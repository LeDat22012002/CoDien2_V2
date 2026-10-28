import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Empty, Grid, Segmented } from 'antd';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PageHeader } from '@/shared/components/PageHeader';
import { notify } from '@/shared/utils/notify';
import { PageDetailPanel } from '@/modules/identity/components/PageDetailPanel';
import { PageFormModal } from '@/modules/identity/components/PageFormModal';
import { PageTreePanel } from '@/modules/identity/components/PageTreePanel';
import {
  PAGE_QUERY_KEYS,
  useDeletePage,
  usePageTree,
  useReorderPages,
} from '@/modules/identity/hooks/usePageQueries';
import { usePermissionGroups } from '@/modules/identity/hooks/useRoleQueries';
import type { Page, PageArea } from '@/modules/identity/types/pages';
import type { Permission } from '@/modules/identity/types/roles';
import { flattenPages, getSiblings, reorderPageTree } from '@/modules/identity/utils/pageTree';

const PARAMS = { area: 'area', page: 'page' } as const;

const AREA_OPTIONS: { value: PageArea; label: string }[] = [
  { value: 'ADMIN', label: 'Menu quản trị' },
  { value: 'PUBLIC', label: 'Menu trang công khai' },
];

interface FormModalState {
  open: boolean;
  /** Có = sửa trang này. */
  page?: Page;
  /** Thêm mới vào nhóm này. */
  parentId?: number;
}

/**
 * Trang và menu (route /admin/pages): cây trang của từng menu (trái) + chi tiết trang đang chọn (phải).
 * Thêm / sửa / xóa / sắp xếp; lưu xong menu Sider và header công khai cập nhật ngay.
 * Khu vực và trang đang chọn lưu trên URL (?area=&page=).
 */
const PageManagementPage = () => {
  const { modal } = App.useApp();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailRef = useRef<HTMLDivElement>(null);

  const area: PageArea = searchParams.get(PARAMS.area) === 'PUBLIC' ? 'PUBLIC' : 'ADMIN';
  const [keyword, setKeyword] = useState('');
  const [manualExpandedKeys, setManualExpandedKeys] = useState<number[] | null>(null);
  const [formModal, setFormModal] = useState<FormModalState>({ open: false });

  const treeQuery = usePageTree();
  const permissionsQuery = usePermissionGroups();
  const reorderMutation = useReorderPages();
  const deleteMutation = useDeletePage();

  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);
  const areaPages = useMemo(() => tree.filter((page) => page.area === area), [tree, area]);
  const pagesById = useMemo(() => new Map(flattenPages(areaPages).map((page) => [page.id, page])), [areaPages]);
  const permissionsById = useMemo(
    () =>
      new Map<number, Permission>(
        (permissionsQuery.data ?? []).flatMap((group) => group.permissions.map((permission) => [permission.id, permission])),
      ),
    [permissionsQuery.data],
  );

  const selected = pagesById.get(Number(searchParams.get(PARAMS.page)));
  // Mặc định mở mọi nhóm cấp gốc
  const expandedKeys = manualExpandedKeys ?? areaPages.filter((page) => page.children.length > 0).map((page) => page.id);

  const selectPage = (pageId: number | undefined, nextArea: PageArea = area) => {
    const params: Record<string, string> = { [PARAMS.area]: nextArea };
    if (pageId) params[PARAMS.page] = String(pageId);
    setSearchParams(params, { replace: true });
    const parentId = pageId ? pagesById.get(pageId)?.parentId : undefined;
    if (parentId && manualExpandedKeys && !manualExpandedKeys.includes(parentId)) {
      setManualExpandedKeys([...manualExpandedKeys, parentId]);
    }
    if (pageId && !screens.lg) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changeArea = (nextArea: PageArea) => {
    setKeyword('');
    setManualExpandedKeys(null);
    selectPage(undefined, nextArea);
  };

  const handleMove = (delta: -1 | 1) => {
    if (!selected) return;
    const parentId = selected.parentId ?? null;
    const list = [...getSiblings(tree, area, parentId)];
    const index = list.findIndex((page) => page.id === selected.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const orderedIds = list.map((page) => page.id);

    queryClient.setQueryData<Page[]>(PAGE_QUERY_KEYS.tree, (previous) =>
      previous ? reorderPageTree(previous, parentId, orderedIds) : previous,
    );
    reorderMutation.mutate({ parentId, area, orderedIds }, { onError: (error) => notify.apiError(error) });
  };

  const handleDelete = () => {
    if (!selected) return;
    modal.confirm({
      title: 'Xóa trang?',
      content: `"${selected.title}" sẽ bị xóa khỏi menu. Màn hình ở Client vẫn còn nhưng không ai vào được qua menu.`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(selected.id);
          notify.success('Đã xóa trang.');
          selectPage(selected.parentId ?? undefined);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });
  };

  const renderDetail = () => {
    if (treeQuery.isError) return <ErrorState error={treeQuery.error} onRetry={() => treeQuery.refetch()} />;
    if (!selected) {
      return (
        <Empty
          description={treeQuery.isPending ? 'Đang tải…' : 'Chọn 1 trang trong cây để xem chi tiết, sửa hoặc sắp xếp'}
        />
      );
    }
    return (
      <PageDetailPanel
        page={selected}
        parent={selected.parentId ? pagesById.get(selected.parentId) : undefined}
        siblings={getSiblings(tree, area, selected.parentId)}
        permissionsById={permissionsById}
        isReordering={reorderMutation.isPending}
        onEdit={() => setFormModal({ open: true, page: selected })}
        onAddChild={() => setFormModal({ open: true, parentId: selected.id })}
        onDelete={handleDelete}
        onMove={handleMove}
        onSelect={(pageId) => selectPage(pageId)}
      />
    );
  };

  return (
    // Desktop: trang cao bằng phần còn lại của màn hình, cây và chi tiết cuộn riêng
    <div className="flex flex-col lg:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Trang và menu"
        description="Sắp xếp menu quản trị (Sider) và menu header trang công khai. Lưu xong menu cập nhật ngay."
        extra={
          <div className="flex gap-2">
            <Button icon={<ReloadOutlined />} onClick={() => treeQuery.refetch()} loading={treeQuery.isFetching}>
              Tải lại
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormModal({ open: true })}
              disabled={!treeQuery.data}
            >
              Thêm trang
            </Button>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <Card
          size="small"
          title={
            <Segmented<PageArea>
              block
              options={AREA_OPTIONS}
              value={area}
              onChange={changeArea}
              className="my-1"
            />
          }
          className="flex min-h-0 flex-col"
          styles={{ body: { padding: 8, flex: 1, minHeight: 0 } }}
        >
          <div className="h-[55dvh] lg:h-full">
            <PageTreePanel
              pages={areaPages}
              selectedId={selected?.id}
              keyword={keyword}
              expandedKeys={expandedKeys}
              isLoading={treeQuery.isPending}
              onKeywordChange={setKeyword}
              onExpand={setManualExpandedKeys}
              onSelect={(pageId) => selectPage(pageId)}
            />
          </div>
        </Card>

        <Card size="small" ref={detailRef} className="min-h-0 scroll-mt-4 lg:overflow-auto">
          {renderDetail()}
        </Card>
      </div>

      <PageFormModal
        open={formModal.open}
        page={formModal.page}
        defaultParentId={formModal.parentId}
        area={area}
        tree={tree}
        permissionGroups={permissionsQuery.data ?? []}
        onClose={() => setFormModal((previous) => ({ ...previous, open: false }))}
        onSaved={(page) => selectPage(page.id)}
      />
    </div>
  );
};

export default PageManagementPage;
