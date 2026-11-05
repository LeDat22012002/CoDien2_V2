export interface LoginRequest {
  empCode: string;
  password: string;
  /** "Nhớ mật khẩu": Server giữ phiên 30 ngày, cookie còn sau khi đóng trình duyệt. */
  isRemembered?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
