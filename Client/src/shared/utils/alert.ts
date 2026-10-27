import Swal from 'sweetalert2';

/** Hộp thoại SweetAlert2 dùng chung nhiều module (giữ giao diện hệ thống cũ). */

const CONFIRM_BUTTON_COLOR = '#3085d6';

/** Chưa đăng nhập mà bấm chức năng cần đăng nhập: cảnh báo rồi trang gọi tự chuyển sang đăng nhập. */
export const showLoginRequiredAlert = () =>
  Swal.fire({
    icon: 'warning',
    title: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!',
    text: 'Bạn cần đăng nhập để sử dụng chức năng này!',
    confirmButtonText: 'Đăng nhập',
    confirmButtonColor: CONFIRM_BUTTON_COLOR,
  });
