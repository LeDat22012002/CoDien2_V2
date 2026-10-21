import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';

const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="Không có quyền truy cập"
      subTitle="Tài khoản của bạn chưa được cấp quyền xem trang này. Liên hệ quản trị viên nếu cần."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Về trang tổng quan
        </Button>
      }
    />
  );
};

export default ForbiddenPage;
