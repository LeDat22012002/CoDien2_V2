import { EllipsisOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import { PAGINATION_DOTS, usePagination } from '@/shared/hooks/usePagination';

/** Tham số trang trên URL, dùng chung với trang gọi API. */
export const PAGE_PARAM = 'page';

interface PaginationProps {
  totalCount: number;
  pageSize: number;
}

/**
 * Phân trang theo URL (?page=), giống Pagination + PagiItem hệ thống cũ:
 * dòng "Hiển thị x - y / tổng" in nghiêng và dãy nút số trang, trang hiện tại có nền xám viền màu chủ đạo.
 * Đổi trang giữ nguyên các tham số khác trên URL.
 */
export const Pagination = ({ totalCount, pageSize }: PaginationProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get(PAGE_PARAM));
  const currentPage = pageParam || 1;
  const pagination = usePagination(totalCount, currentPage, pageSize);

  const start = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const end = Math.min(currentPage * pageSize, totalCount);

  const handlePageChange = (page: number) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(PAGE_PARAM, String(page));
      return next;
    });

  return (
    <div className="flex w-full flex-col items-center justify-between gap-2 text-sm lg:flex-row">
      <span className="italic">
        Hiển thị {start} - {end} / {totalCount}
      </span>

      <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-center">
        {pagination.map((item, index) =>
          item === PAGINATION_DOTS ? (
            <span key={`dots-${index}`} className="flex size-8 items-end justify-center pb-2 text-text-secondary">
              <EllipsisOutlined aria-hidden />
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Trang ${item}`}
              aria-current={item === currentPage ? 'page' : undefined}
              onClick={() => handlePageChange(item)}
              className={`m-1 flex size-9 cursor-pointer items-center justify-center rounded-md border border-solid bg-transparent lg:size-8 ${
                // Chưa có ?page trên URL: trang 1 chỉ tô nền (như PagiItem cũ)
                item === pageParam
                  ? 'border-primary bg-slate-200'
                  : !pageParam && item === 1
                    ? 'border-transparent bg-slate-200'
                    : 'border-transparent'
              }`}
            >
              {item}
            </button>
          ),
        )}
      </nav>
    </div>
  );
};
