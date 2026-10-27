import { useCallback, useState } from 'react';
import type { LoginRequest } from '@/modules/identity/types/identity';

/**
 * "Nhớ mật khẩu": app chỉ lưu mã nhân viên (localStorage) để tự điền lần sau.
 * Mật khẩu KHÔNG lưu trong app mà nhờ trình quản lý mật khẩu của trình duyệt lưu (đã mã hóa) qua
 * Credential Management API; lần sau trình duyệt tự điền vào ô có autocomplete="current-password".
 * API này chỉ có trên Chrome/Edge chạy HTTPS hoặc localhost; nơi khác vẫn nhớ được mã nhân viên.
 */

const REMEMBERED_EMP_CODE_KEY = 'nm-codien2.remembered-emp-code';

const readRememberedEmpCode = () => {
  try {
    return localStorage.getItem(REMEMBERED_EMP_CODE_KEY);
  } catch {
    return null;
  }
};

const writeRememberedEmpCode = (empCode: string | null) => {
  try {
    if (empCode) localStorage.setItem(REMEMBERED_EMP_CODE_KEY, empCode);
    else localStorage.removeItem(REMEMBERED_EMP_CODE_KEY);
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư…): bỏ qua, đăng nhập vẫn bình thường
  }
};

const storeBrowserCredential = async ({ empCode, password }: LoginRequest) => {
  if (!window.PasswordCredential || !navigator.credentials || !window.isSecureContext) return;
  try {
    await navigator.credentials.store(new window.PasswordCredential({ id: empCode, password, name: empCode }));
  } catch {
    // Người dùng từ chối lưu hoặc trình duyệt không hỗ trợ: không ảnh hưởng đăng nhập
  }
};

export const useRememberedLogin = () => {
  const [rememberedEmpCode] = useState(readRememberedEmpCode);

  /** Gọi sau khi đăng nhập thành công. */
  const saveLogin = useCallback(async (request: LoginRequest, isRemembered: boolean) => {
    writeRememberedEmpCode(isRemembered ? request.empCode : null);
    if (isRemembered) await storeBrowserCredential(request);
  }, []);

  return { rememberedEmpCode, saveLogin };
};
