import { StyleProvider } from '@ant-design/cssinjs';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { RouterProvider } from 'react-router';
import { configureAuthHandlers } from '@/shared/api/axiosClient';
import { queryClient } from '@/shared/api/queryClient';
import { THEME_CONFIG } from '@/shared/theme/theme';
import { router } from '@/routes/router';
import { useAuthStore } from '@/stores/authStore';

configureAuthHandlers({
  onSessionRefreshed: (result) => useAuthStore.getState().setUser(result.user),
  onSessionExpired: () => {
    useAuthStore.getState().clearSession();
    queryClient.clear();
  },
});

/** Màn hình cảm ứng (tablet ở xưởng): control cỡ lớn để vùng bấm đạt tối thiểu 44px. */
const IS_TOUCH_DEVICE = window.matchMedia('(pointer: coarse)').matches;

const App = () => (
  <StyleProvider layer>
    <ConfigProvider locale={viVN} theme={THEME_CONFIG} componentSize={IS_TOUCH_DEVICE ? 'large' : 'middle'}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StyleProvider>
);

export default App;
