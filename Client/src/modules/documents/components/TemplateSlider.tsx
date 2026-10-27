import type { Ref } from 'react';
import SliderModule, { type Settings } from 'react-slick';
import type { DocumentTemplateOption, TemplateSliderInstance } from '@/modules/documents/types/documents';

/** react-slick là gói CommonJS: qua Vite, default import có thể là object `{ default: Slider }` thay vì component. */
const Slider =
  (SliderModule as unknown as { default?: typeof SliderModule }).default ?? SliderModule;

/** Giống `settings` hệ thống cũ; thêm mốc điện thoại để nút không bị bóp quá hẹp. */
const SLIDER_SETTINGS: Settings = {
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 5,
  slidesToScroll: 5,
  swipeToSlide: true,
  arrows: true,
  responsive: [
    { breakpoint: 1024, settings: { slidesToShow: 5 } },
    { breakpoint: 768, settings: { slidesToShow: 3 } },
    { breakpoint: 576, settings: { slidesToShow: 2, slidesToScroll: 2 } },
  ],
};

interface TemplateSliderProps {
  sliderRef: Ref<TemplateSliderInstance>;
  templates: DocumentTemplateOption[];
  activeTemplateId?: number;
  onChange: (templateId: number) => void;
}

/** Dãy nút biểu mẫu để lọc sổ văn bản (react-slick, như hệ thống cũ). */
export const TemplateSlider = ({ sliderRef, templates, activeTemplateId, onChange }: TemplateSliderProps) => (
  <div className="my-1 h-[50px] w-full">
    <div className="py-2">
      <Slider ref={sliderRef} {...SLIDER_SETTINGS} className="template-slider">
        {templates.map((template) => {
          const isActive = template.id === activeTemplateId;
          return (
            <div key={template.id} className="px-1 sm:px-4 lg:px-10">
              <button
                type="button"
                onClick={() => onChange(template.id)}
                title={template.name}
                aria-pressed={isActive}
                className={`flex max-w-[200px] cursor-pointer items-center justify-center gap-1 rounded-md border border-solid border-primary px-[14px] py-1.5 text-sm transition ${
                  isActive ? 'bg-primary text-white' : 'bg-transparent text-black'
                }`}
              >
                <span className="block max-w-[200px] truncate">{template.name}</span>
              </button>
            </div>
          );
        })}
      </Slider>
    </div>
  </div>
);
