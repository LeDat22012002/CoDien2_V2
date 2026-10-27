interface RibbonTitleProps {
  title: string;
}

/**
 * Tiêu đề trang công khai, giống Label hệ thống cũ: khối nền màu chủ đạo vừa đúng độ dài chữ,
 * đuôi tam giác vát chéo bên phải (cao 40px, rộng 45px).
 */
export const RibbonTitle = ({ title }: RibbonTitleProps) => (
  <div className="w-full">
    <div className="relative inline-block">
      <h1 className="m-0 bg-primary px-4 py-2 text-base leading-6 font-semibold text-white">{title}</h1>
      <span
        aria-hidden="true"
        className="absolute top-0 -right-[45px] size-0 border-t-40 border-r-0 border-b-0 border-l-45 border-solid border-t-transparent border-l-primary"
      />
    </div>
  </div>
);
