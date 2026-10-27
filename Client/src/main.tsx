import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/utils/dayjs';
import { applyThemeCssVariables } from '@/shared/theme/theme';
import App from '@/App';
import '@/shared/theme/fonts.css';
// CSS của react-slick nạp trước index.css để phần tùy biến slider trong index.css được áp sau cùng
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './index.css';

applyThemeCssVariables();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
