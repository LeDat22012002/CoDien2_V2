import { Button, Result } from 'antd';
import { useNavigate } from 'react-router';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="Không tìm thấy trang"
      subTitle="Đường dẫn không tồn tại hoặc đã bị thay đổi."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Về trang tổng quan
        </Button>
      }
    />
  );
};

export default NotFoundPage;
