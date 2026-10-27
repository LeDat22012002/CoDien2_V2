import Swal from 'sweetalert2';
import { notify } from '@/shared/utils/notify';

/** Hộp thoại báo cấp số thành công kèm nút copy số hiệu, giữ giao diện showCopyAlert của hệ thống cũ. */

const ALERT_STYLE = {
  font: "'Times New Roman', Times, serif",
  titleColor: '#1a1a1a',
  valueColor: '#003366',
  copyColor: '#007bff',
  confirmButtonColor: '#3085d6',
} as const;

/** Icon copy (nét giống TbCopy của hệ thống cũ). */
const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:middle"><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>`;

/** Tên biểu mẫu, số hiệu lấy từ dữ liệu nên phải escape trước khi chèn vào HTML của hộp thoại. */
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

const COPY_SUCCESS_MESSAGE = 'Đã copy số hiệu!';
const COPY_TOAST_ID = 'copy-document-number';

/** Trình duyệt chặn Clipboard API (HTTP/IIS nội bộ, trình duyệt cũ) thì copy kiểu truyền thống. */
const fallbackCopyText = (text: string) => {
  try {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    notify.success(COPY_SUCCESS_MESSAGE, { toastId: COPY_TOAST_ID });
  } catch {
    notify.error('Trình duyệt không hỗ trợ chức năng copy!');
  }
};

const copyText = (text: string) => {
  if (!navigator.clipboard?.writeText) {
    fallbackCopyText(text);
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => notify.success(COPY_SUCCESS_MESSAGE, { toastId: COPY_TOAST_ID }))
    .catch(() => fallbackCopyText(text));
};

/** Kích thước hộp thoại: gọn hơn mặc định của Swal (rộng 32em, icon 5em); điện thoại tự co theo màn hình. */
const POPUP_WIDTH = 380;
const POPUP_PADDING = '0 0 1.25em';
const ICON_SCALE = '0.6';

export const showIssueResultAlert = (title: string, documentNumber: string) =>
  Swal.fire({
    // Dòng tiêu đề đặt chung khối html (không dùng `title` của Swal) để bỏ khoảng trống lớn quanh thẻ h2
    html: `
      <div style="font-size:16px;font-family:${ALERT_STYLE.font};font-weight:400;color:${ALERT_STYLE.titleColor};">
        ${escapeHtml(title)}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:6px;flex-wrap:wrap;">
        <strong style="font-size:18px;font-family:${ALERT_STYLE.font};color:${ALERT_STYLE.valueColor};letter-spacing:0.3px;word-break:break-all;">
          ${escapeHtml(documentNumber)}
        </strong>
        <button id="copy-btn" type="button" title="Copy số hiệu" aria-label="Copy số hiệu"
          style="border:none;background:transparent;cursor:pointer;color:${ALERT_STYLE.copyColor};font-size:16px;transition:0.2s;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;">
          ${COPY_ICON_SVG}
        </button>
      </div>`,
    icon: 'success',
    width: POPUP_WIDTH,
    padding: POPUP_PADDING,
    confirmButtonText: 'Đóng',
    confirmButtonColor: ALERT_STYLE.confirmButtonColor,
    // Icon của Swal tính theo em: giảm font-size của icon là thu nhỏ cả vòng tròn lẫn dấu tích (làm trước khi hiện để không bị giật)
    willOpen: (popup) => {
      const icon = popup.querySelector<HTMLElement>('.swal2-icon');
      if (icon) icon.style.fontSize = `${ICON_SCALE}em`;
    },
    didOpen: (popup) => {
      popup.querySelector('#copy-btn')?.addEventListener('click', () => copyText(documentNumber));
    },
  });
