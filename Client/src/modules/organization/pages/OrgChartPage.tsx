import { Spin } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ErrorState } from '@/shared/components/ErrorState';
import { OrgChartCanvas } from '@/modules/organization/components/orgChart/OrgChartCanvas';
import { OrgChartMembersDrawer } from '@/modules/organization/components/orgChart/OrgChartMembersDrawer';
import { OrgChartToolbar } from '@/modules/organization/components/orgChart/OrgChartToolbar';
import { BAND_OPTIONS, type BandOption } from '@/modules/organization/constants/orgChart';
import { useOrgChart } from '@/modules/organization/hooks/useOrganizationQueries';
import type { ChartBox, ChartLayout, MembersDrawerTarget } from '@/modules/organization/types/orgChart';
import { buildOrgChartLayout, getFitScale } from '@/modules/organization/utils/orgChartLayout';
import { normalizeChartText } from '@/modules/organization/utils/orgChartText';

interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Sơ đồ tổ chức nhà máy (trang công khai, route /org/organizationalchart), dựng lại theo SoDoToChuc
 * hệ thống cũ, bố cục theo bản vẽ BM.01-QT.04:
 *  Hàng 1 GĐ · Hàng 2 PGĐ · Hàng 3 Xưởng · Hàng 4 Đội / KHTH / An toàn / Kho · Hàng 5 Kỹ sư · Hàng 6 Tổ / Nhân viên.
 * Kéo để di chuyển, cuộn chuột / chụm 2 ngón để phóng to; rê chuột vào ô để xem nhanh, bấm để mở danh sách.
 */
const OrgChartPage = () => {
  const chartQuery = useOrgChart();
  const tree = chartQuery.data;

  const [keyword, setKeyword] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  // Mỗi lần mở trang luôn về "Tự động"
  const [bands, setBands] = useState<BandOption>('auto');
  const [drawerTarget, setDrawerTarget] = useState<MembersDrawerTarget | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // Theo dõi kích thước khung vẽ để tự chọn số dải và vừa màn hình khi đổi cỡ cửa sổ
  useEffect(() => {
    if (!viewportElement) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport((previous) =>
        Math.abs(previous.width - width) < 4 && Math.abs(previous.height - height) < 4 ? previous : { width, height },
      );
    });
    observer.observe(viewportElement);
    return () => observer.disconnect();
  }, [viewportElement]);

  // Dựng sẵn bố cục 1 / 2 / 3 dải; "Tự động" chọn bố cục hiển thị được chữ to nhất
  const layouts = useMemo(
    () => (tree?.root ? BAND_OPTIONS.map((count) => buildOrgChartLayout(tree.root!, count)) : []),
    [tree],
  );
  const layout = useMemo<ChartLayout | null>(() => {
    if (!layouts.length) return null;
    if (bands !== 'auto') return layouts[BAND_OPTIONS.indexOf(bands)];
    if (!viewport.width) return layouts[1];
    return layouts.reduce((best, item) =>
      getFitScale(item, viewport) > getFitScale(best, viewport) + 0.01 ? item : best,
    );
  }, [layouts, bands, viewport]);

  // ----- Tìm kiếm -----
  const matches = useMemo(() => {
    const search = normalizeChartText(keyword.trim());
    if (!search || !layout) return null;
    return layout.boxes.filter((box) => box.searchText.includes(search));
  }, [keyword, layout]);
  const matchIds = useMemo(() => (matches ? new Set(matches.map((box) => box.id)) : null), [matches]);
  const activeBox = matches?.length ? matches[matchIndex % matches.length] : null;

  const changeKeyword = (value: string) => {
    setKeyword(value);
    setMatchIndex(0);
  };

  const stepMatch = (delta: number) => {
    if (!matches?.length) return;
    setMatchIndex((index) => (index + delta + matches.length) % matches.length);
  };

  // ----- Zoom / di chuyển -----
  const fitToScreen = useCallback(() => {
    const api = transformRef.current;
    if (!api || !viewportElement || !layout) return;
    const size = { width: viewportElement.clientWidth, height: viewportElement.clientHeight };
    const scale = getFitScale(layout, size);
    api.setTransform(
      (size.width - layout.width * scale) / 2,
      Math.max(0, (size.height - layout.height * scale) / 2),
      scale,
      200,
    );
  }, [layout, viewportElement]);

  const resetZoom = () => {
    const api = transformRef.current;
    if (!api || !viewportElement || !layout) return;
    api.setTransform((viewportElement.clientWidth - layout.width) / 2, 0, 1, 300);
  };

  // Đổi bố cục / cỡ khung → vừa màn hình (chờ TransformWrapper gắn xong)
  useEffect(() => {
    if (!layout) return undefined;
    const timer = setTimeout(fitToScreen, 30);
    return () => clearTimeout(timer);
  }, [layout, viewport, fitToScreen]);

  // Kết quả tìm kiếm đang chọn → đưa ô ra giữa màn hình
  useEffect(() => {
    const api = transformRef.current;
    if (!activeBox || !api || !viewportElement) return;
    const scale = Math.max(api.instance.state.scale, 1.2);
    api.setTransform(
      viewportElement.clientWidth / 2 - (activeBox.x + activeBox.w / 2) * scale,
      viewportElement.clientHeight / 2 - (activeBox.y + activeBox.h / 2) * scale,
      scale,
      400,
    );
  }, [activeBox, viewportElement]);

  // ----- Bấm vào ô -----
  const openBox = useCallback((box: ChartBox) => {
    if (box.kind === 'BLOCK' && box.block) setDrawerTarget({ type: 'block', block: box.block, unit: box.unit });
    else setDrawerTarget({ type: 'unit', unit: box.unit });
  }, []);

  if (chartQuery.isError && !tree) {
    return (
      <ErrorState error={chartQuery.error} title="Không tải được sơ đồ tổ chức" onRetry={() => chartQuery.refetch()} />
    );
  }

  return (
    // Toàn màn hình dưới header 64px (route khai báo handle.isFullScreen nên PublicLayout bỏ lề, bỏ giới hạn bề rộng)
    <div className="flex h-[calc(100dvh-64px)] min-h-[480px] flex-col overflow-hidden bg-bg-container">
      <OrgChartToolbar
        keyword={keyword}
        onKeywordChange={changeKeyword}
        matchCount={matches?.length ?? 0}
        matchIndex={matches?.length ? matchIndex % matches.length : 0}
        onPrevMatch={() => stepMatch(-1)}
        onNextMatch={() => stepMatch(1)}
        bands={bands}
        onBandsChange={setBands}
        onZoomIn={() => transformRef.current?.zoomIn(0.2)}
        onZoomOut={() => transformRef.current?.zoomOut(0.2)}
        onFit={fitToScreen}
        onReset={resetZoom}
        onReload={() => chartQuery.refetch()}
        isLoading={chartQuery.isFetching}
      />

      {/* Khung vẽ: kích thước không phụ thuộc nội dung (nội dung nằm trong lớp absolute) */}
      <div className="relative min-h-0 flex-1 bg-[#fbfbf8]">
        <div ref={setViewportElement} className="absolute inset-0 overflow-hidden">
          {chartQuery.isPending ? (
            <div className="flex h-full items-center justify-center">
              <Spin size="large" description="Đang tải sơ đồ…" />
            </div>
          ) : layout ? (
            <TransformWrapper
              ref={transformRef}
              minScale={0.1}
              maxScale={3}
              initialScale={0.8}
              limitToBounds={false}
              centerOnInit={false}
              wheel={{ step: 0.08 }}
              doubleClick={{ disabled: true }}
            >
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <OrgChartCanvas
                  layout={layout}
                  matchIds={matchIds}
                  activeId={activeBox?.id}
                  onBoxClick={openBox}
                />
              </TransformComponent>
            </TransformWrapper>
          ) : (
            <div className="flex h-full items-center justify-center text-text-secondary">
              Chưa có dữ liệu sơ đồ tổ chức.
            </div>
          )}
        </div>
      </div>

      <OrgChartMembersDrawer target={drawerTarget} onClose={() => setDrawerTarget(null)} />
    </div>
  );
};

export default OrgChartPage;
