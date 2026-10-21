import { useEffect } from 'react';
import { refreshSession } from '@/shared/api/axiosClient';
import { getMe } from '@/modules/identity/api/identityApi';
import { useAuthStore } from '@/stores/authStore';

let bootstrapPromise: Promise<void> | null = null;

/** Khôi phục phiên từ cookie refresh_token khi mở app; gom lời gọi trùng (StrictMode, nhiều route guard). */
const bootstrapSession = () => {
  bootstrapPromise ??= (async () => {
    const { setProfile, clearSession } = useAuthStore.getState();
    try {
      await refreshSession();
      setProfile(await getMe());
    } catch {
      clearSession();
    } finally {
      bootstrapPromise = null;
    }
  })();
  return bootstrapPromise;
};

export const useSessionBootstrap = () => {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'unknown') void bootstrapSession();
  }, [status]);

  return status;
};
