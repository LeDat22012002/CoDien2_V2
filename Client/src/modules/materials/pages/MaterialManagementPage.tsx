import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Checkbox,
  Empty,
  Grid,
  Input,
  Pagination,
  Select,
  Table,
  Tooltip,
  Typography,
  type TableColumnsType,
  type TableProps,
} from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/shared/components/ErrorState";
import { PageHeader } from "@/shared/components/PageHeader";
import { COLUMN_WIDTH, getTableScrollX } from "@/shared/constants/tableColumns";
import { PERMISSION_CODES } from "@/shared/constants/permissionCodes";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useTableScrollY } from "@/shared/hooks/useTableScrollY";
import { EMPTY_TEXT } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";
import { useHasPermission } from "@/stores/authStore";
import { MaterialFormModal } from "@/modules/materials/components/MaterialFormModal";
import {
  useDeleteMaterial,
  useMaterialLookups,
  useMaterials,
} from "@/modules/materials/hooks/useMaterialQueries";
import type {
  Material,
  MaterialSortBy,
} from "@/modules/materials/types/materials";

const SEARCH_DEBOUNCE_MS = 500;
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Tham số trên URL để F5 / quay lại không mất bộ lọc, sắp xếp và trang. */
const PARAMS = {
  keyword: "q",
  plant: "plant",
  materialGroup: "group",
  typeOfSupplies: "type",
  missingUom: "noUom",
  sortBy: "sort",
  sortDirection: "dir",
  page: "page",
  pageSize: "limit",
} as const;

type ParamKey = keyof typeof PARAMS;

const SORTABLE_COLUMNS: MaterialSortBy[] = [
  "code",
  "description",
  "plant",
  "materialGroup",
  "typeOfSupplies",
];

/** Ô 1 dòng: chữ dài cắt "…", hover hiện đầy đủ. */
const renderTruncated = (value: string | null | undefined, className = "") =>
  value ? (
    <Typography.Text
      ellipsis={{ tooltip: { title: value, placement: "topLeft" } }}
      className={`block ${className}`}
    >
      {value}
    </Typography.Text>
  ) : (
    <span className="text-text-secondary">{EMPTY_TEXT}</span>
  );

const toSelectOptions = (values?: string[]) =>
  (values ?? []).map((value) => ({ value, label: value }));

/**
 * Danh mục vật tư (route /admin/materials): tìm theo mã / tên, lọc theo Plant, nhóm, loại, thiếu ĐVT;
 * thêm, sửa, xóa. Vào trang cần materials.view; nút thêm/sửa/xóa chỉ hiện khi có materials.manage
 * (Server vẫn kiểm tra lại).
 */
const MaterialManagementPage = () => {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { containerRef, scrollY } = useTableScrollY();
  const canManage = useHasPermission(PERMISSION_CODES.materials.manage);
  const [searchParams, setSearchParams] = useSearchParams();

  const keyword = searchParams.get(PARAMS.keyword) ?? "";
  const plant = searchParams.get(PARAMS.plant) ?? undefined;
  const materialGroup = searchParams.get(PARAMS.materialGroup) ?? undefined;
  const typeOfSupplies = searchParams.get(PARAMS.typeOfSupplies) ?? undefined;
  const missingUom = searchParams.get(PARAMS.missingUom) === "1";
  const sortByParam = searchParams.get(PARAMS.sortBy) as MaterialSortBy | null;
  const sortBy =
    sortByParam && SORTABLE_COLUMNS.includes(sortByParam)
      ? sortByParam
      : undefined;
  const sortDirection =
    searchParams.get(PARAMS.sortDirection) === "desc" ? "desc" : "asc";
  const pageIndex = Number(searchParams.get(PARAMS.page)) || 1;
  const pageSize =
    Number(searchParams.get(PARAMS.pageSize)) || DEFAULT_PAGE_SIZE;

  const [keywordInput, setKeywordInput] = useState(keyword);
  const debouncedKeyword = useDebouncedValue(
    keywordInput.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  // Đóng modal chỉ tắt cờ open, giữ dữ liệu dòng để nội dung không chớp trong lúc modal mờ dần
  const [editingMaterial, setEditingMaterial] = useState<Material>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const lookupsQuery = useMaterialLookups();
  const materialsQuery = useMaterials({
    keyword: keyword || undefined,
    plant,
    materialGroup,
    typeOfSupplies,
    missingUom: missingUom || undefined,
    sortBy,
    sortDirection: sortBy ? sortDirection : undefined,
    pageIndex,
    pageSize,
  });
  const deleteMutation = useDeleteMaterial();

  /** Ghi tham số lên URL; đổi bộ lọc thì về trang 1. */
  const updateParams = (
    patch: Partial<Record<ParamKey, string | number | undefined>>,
    resetPage = true,
  ) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(patch).forEach(([key, value]) => {
          const param = PARAMS[key as ParamKey];
          if (value === undefined || value === "") next.delete(param);
          else next.set(param, String(value));
        });
        if (resetPage) next.delete(PARAMS.page);
        return next;
      },
      { replace: true },
    );

  // Ô tìm kiếm → URL (sau 500ms ngừng gõ)
  useEffect(() => {
    if (debouncedKeyword !== keyword)
      updateParams({ keyword: debouncedKeyword });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người dùng ngừng gõ
  }, [debouncedKeyword]);

  const handlePageChange = (nextPage: number, nextPageSize: number) =>
    updateParams(
      {
        page: nextPage === 1 ? undefined : nextPage,
        pageSize: nextPageSize === DEFAULT_PAGE_SIZE ? undefined : nextPageSize,
      },
      nextPageSize !== pageSize,
    );

  /** Bấm tiêu đề cột để sắp xếp phía Server; bỏ sắp xếp = mặc định theo mã tăng dần. */
  const handleTableChange: TableProps<Material>["onChange"] = (
    _,
    __,
    sorter,
  ) => {
    const current = Array.isArray(sorter) ? sorter[0] : sorter;
    const key = current?.order
      ? (current.columnKey as MaterialSortBy)
      : undefined;
    updateParams({
      sortBy: key,
      sortDirection: key && current?.order === "descend" ? "desc" : undefined,
    });
  };

  const sortOrderOf = (key: MaterialSortBy) =>
    sortBy === key ? (sortDirection === "desc" ? "descend" : "ascend") : null;

  const openForm = (material?: Material) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
  };

  const confirmDelete = (material: Material) =>
    modal.confirm({
      title: "Xóa vật tư?",
      content: `"${material.code ?? ""}${material.plant ? ` – ${material.plant}` : ""}" sẽ bị xóa khỏi danh mục. Vật tư đã nhập ở báo cáo tuần vẫn giữ nguyên.`,
      okText: "Xóa",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(material.id);
          notify.success("Xóa vật tư thành công.");
          // Xóa dòng cuối của trang cuối thì lùi 1 trang
          if (materialsQuery.data?.items.length === 1 && pageIndex > 1)
            updateParams({ page: pageIndex - 1 }, false);
        } catch (error) {
          notify.apiError(error);
        }
      },
    });

  const columns: TableColumnsType<Material> = [
    {
      title: "STT",
      key: "index",
      width: COLUMN_WIDTH.index,
      align: "center",
      render: (_, __, index) => (pageIndex - 1) * pageSize + index + 1,
    },
    {
      title: "Mã vật tư",
      dataIndex: "code",
      key: "code",
      width: COLUMN_WIDTH.tag,
      sorter: true,
      sortOrder: sortOrderOf("code"),
      render: (value?: string | null) =>
        renderTruncated(value, "font-mono font-medium"),
    },
    {
      title: "Tên vật tư",
      dataIndex: "description",
      key: "description",
      width: COLUMN_WIDTH.longText,
      sorter: true,
      sortOrder: sortOrderOf("description"),
      render: (value?: string | null) => renderTruncated(value),
    },
    {
      title: "ĐVT",
      dataIndex: "uom",
      key: "uom",
      width: COLUMN_WIDTH.short,
      render: (value?: string | null) => renderTruncated(value),
    },
    {
      title: "Plant",
      dataIndex: "plant",
      key: "plant",
      width: COLUMN_WIDTH.short,
      responsive: ["md"],
      sorter: true,
      sortOrder: sortOrderOf("plant"),
      render: (value?: string | null) => renderTruncated(value),
    },
    {
      title: "Nhóm vật tư",
      dataIndex: "materialGroup",
      key: "materialGroup",
      width: COLUMN_WIDTH.text,
      responsive: ["lg"],
      sorter: true,
      sortOrder: sortOrderOf("materialGroup"),
      render: (value?: string | null) => renderTruncated(value),
    },
    {
      title: "Loại vật tư",
      dataIndex: "typeOfSupplies",
      key: "typeOfSupplies",
      width: COLUMN_WIDTH.tag,
      responsive: ["md"],
      sorter: true,
      sortOrder: sortOrderOf("typeOfSupplies"),
      render: (value?: string | null) => renderTruncated(value),
    },
    {
      title: "Cấp vật tư",
      dataIndex: "materialLevel",
      key: "materialLevel",
      width: COLUMN_WIDTH.tag,
      responsive: ["xl"],
      render: (value?: string | null) => renderTruncated(value),
    },
    {
      title: "Số tài liệu",
      dataIndex: "documentNo",
      key: "documentNo",
      width: COLUMN_WIDTH.tag,
      responsive: ["xl"],
      render: (value?: string | null) => renderTruncated(value),
    },
    ...(canManage
      ? ([
          {
            title: "Thao tác",
            key: "actions",
            width: COLUMN_WIDTH.actions,
            align: "center",
            fixed: "right",
            render: (_, material) => (
              <div className="flex items-center justify-center gap-1">
                <Tooltip title="Sửa">
                  <Button
                    type="text"
                    aria-label={`Sửa vật tư ${material.code ?? ""}`}
                    icon={<EditOutlined className="text-primary" />}
                    onClick={() => openForm(material)}
                  />
                </Tooltip>
                <Tooltip title="Xóa">
                  <Button
                    type="text"
                    danger
                    aria-label={`Xóa vật tư ${material.code ?? ""}`}
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(material)}
                  />
                </Tooltip>
              </div>
            ),
          },
        ] satisfies TableColumnsType<Material>)
      : []),
  ];

  return (
    // Trang cao bằng phần còn lại của màn hình để khung bảng cố định, thân bảng cuộn bên trong
    <div className="flex h-[calc(100dvh-88px)] flex-col md:h-[calc(100dvh-104px)]">
      <PageHeader
        title="Danh mục vật tư"
        description="Mã, tên, đơn vị tính vật tư để gợi ý và tự điền khi nhập vật tư ở báo cáo công việc tuần."
        extra={
          canManage ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openForm()}
            >
              Thêm vật tư
            </Button>
          ) : undefined
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-md bg-bg-container p-3 md:p-4">
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <Input
            allowClear
            aria-label="Tìm vật tư"
            prefix={
              <SearchOutlined className="text-text-secondary" aria-hidden />
            }
            placeholder="Tìm mã hoặc tên vật tư…"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="min-w-0 lg:w-72"
          />
          <Select
            allowClear
            showSearch
            aria-label="Lọc theo Plant"
            placeholder="Plant"
            value={plant}
            loading={lookupsQuery.isLoading}
            options={toSelectOptions(lookupsQuery.data?.plants)}
            onChange={(value?: string) => updateParams({ plant: value })}
            className="w-full lg:w-40"
          />
          <Select
            allowClear
            showSearch
            aria-label="Lọc theo nhóm vật tư"
            placeholder="Nhóm vật tư"
            value={materialGroup}
            loading={lookupsQuery.isLoading}
            options={toSelectOptions(lookupsQuery.data?.materialGroups)}
            onChange={(value?: string) =>
              updateParams({ materialGroup: value })
            }
            className="w-full lg:w-56"
          />
          <Select
            allowClear
            showSearch
            aria-label="Lọc theo loại vật tư"
            placeholder="Loại vật tư"
            value={typeOfSupplies}
            loading={lookupsQuery.isLoading}
            options={toSelectOptions(lookupsQuery.data?.typesOfSupplies)}
            onChange={(value?: string) =>
              updateParams({ typeOfSupplies: value })
            }
            className="w-full lg:w-44"
          />
          <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:ml-auto">
            <Checkbox
              checked={missingUom}
              onChange={(event) =>
                updateParams({
                  missingUom: event.target.checked ? 1 : undefined,
                })
              }
            >
              Chưa có ĐVT
            </Checkbox>
            <Tooltip title="Tải lại">
              <Button
                aria-label="Tải lại danh sách"
                icon={<ReloadOutlined />}
                onClick={() => materialsQuery.refetch()}
                loading={materialsQuery.isFetching}
              />
            </Tooltip>
          </div>
        </div>

        {materialsQuery.isError && !materialsQuery.data ? (
          <ErrorState
            error={materialsQuery.error}
            onRetry={() => materialsQuery.refetch()}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div ref={containerRef} className="min-h-72 flex-1 overflow-hidden">
              <Table<Material>
                rowKey="id"
                size="middle"
                bordered
                loading={materialsQuery.isFetching}
                columns={columns}
                dataSource={materialsQuery.data?.items ?? []}
                pagination={false}
                onChange={handleTableChange}
                showSorterTooltip={false}
                tableLayout="fixed"
                scroll={{ x: getTableScrollX(columns, screens), y: scrollY }}
                className="[&_.ant-table-cell]:whitespace-nowrap"
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Không có vật tư nào phù hợp"
                    />
                  ),
                }}
              />
            </div>
            <Pagination
              align="end"
              current={pageIndex}
              pageSize={pageSize}
              total={materialsQuery.data?.totalCount ?? 0}
              showSizeChanger
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              showTotal={(total, [from, to]) =>
                `${from}–${to} / ${total} vật tư`
              }
              onChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {canManage && (
        <MaterialFormModal
          open={isFormOpen}
          material={editingMaterial}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
};

export default MaterialManagementPage;
