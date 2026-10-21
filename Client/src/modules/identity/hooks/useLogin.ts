import { useMutation } from '@tanstack/react-query';
import { setAccessToken } from '@/shared/api/axiosClient';
import { getMe, login, type LoginRequest } from '@/modules/identity/api/identityApi';
import { useAuthStore } from '@/stores/authStore';

export const useLogin = () => {
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: async (request: LoginRequest) => {
      const result = await login(request);
      setAccessToken(result.accessToken);
      return getMe();
    },
    onSuccess: setProfile,
  });
};
