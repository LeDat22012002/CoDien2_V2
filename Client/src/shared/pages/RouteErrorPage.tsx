import { ReloadOutlined } from '@ant-design/icons';
import { Button, Result } from 'antd';

/** errorElement của router: lỗi render hoặc tải chunk thất bại (thường do vừa deploy bản mới). */
const RouteErrorPage = () => (
  <Result
    status="error"
    title="Đã xảy ra lỗi"
    subTitle="Trang gặp sự cố khi hiển thị. Vui lòng tải lại trang; nếu vẫn lỗi, liên hệ quản trị viên."
    extra={
      <Button type="primary" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
        Tải lại trang
      </Button>
    }
  />
);

export default RouteErrorPage;
