import SliderModule, { type Settings } from "react-slick";
import type { WeeklyForm } from "@/modules/workReports/types/workReports";

/** react-slick là gói CommonJS: qua Vite, default import có thể là object `{ default: Slider }` thay vì component. */
const Slider =
  (SliderModule as unknown as { default?: typeof SliderModule }).default ??
  SliderModule;

/** Giống dãy tab biểu mẫu ở Sổ văn bản; thêm mốc điện thoại để nút không bị bóp quá hẹp. */
const SLIDER_SETTINGS: Settings = {
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 5,
  slidesToScroll: 5,
  swipeToSlide: true,
  arrows: true,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 4, slidesToScroll: 4 } },
    { breakpoint: 768, settings: { slidesToShow: 3, slidesToScroll: 3 } },
    { breakpoint: 576, settings: { slidesToShow: 2, slidesToScroll: 2 } },
  ],
};

interface UnitSheetSliderProps {
  forms: WeeklyForm[];
  activeFormId?: number;
  onChange: (formId: number) => void;
}

/**
 * Dãy "sheet" tổ/kíp của Bảng công việc (kiểu xem theo sheet, như file Excel mỗi tổ 1 sheet): bấm 1 tổ/kíp để xem
 * riêng bảng của tổ đó. Dùng react-slick và style `.template-slider` (index.css) giống dãy tab biểu mẫu ở Sổ văn bản.
 */
export const UnitSheetSlider = ({
  forms,
  activeFormId,
  onChange,
}: UnitSheetSliderProps) => (
  <div className="w-full shrink-0">
    <Slider {...SLIDER_SETTINGS} className="template-slider">
      {forms.map((form) => {
        const isActive = form.formId === activeFormId;
        const label = `${form.orderLabel}. ${form.unitName}`;
        return (
          // Nút ôm sát chữ, căn giữa ô slide; px-2 + padding của slide (index.css) tạo khoảng cách rộng giữa các nút
          <div key={form.formId} className="px-2">
            <button
              type="button"
              onClick={() => onChange(form.formId)}
              title={`${label} · ${form.itemCount} dòng`}
              aria-pressed={isActive}
              className={`mx-auto flex max-w-full cursor-pointer items-center rounded-md border border-solid border-primary px-2.5 py-1 text-sm transition ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-transparent text-text hover:bg-primary/10"
              }`}
            >
              <span className="block truncate">{label}</span>
            </button>
          </div>
        );
      })}
    </Slider>
  </div>
);
