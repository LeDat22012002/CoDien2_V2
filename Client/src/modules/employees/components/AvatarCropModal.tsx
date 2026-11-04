import { Button, Modal, Slider } from 'antd';
import { useRef, useState } from 'react';
import AvatarEditor, { type AvatarEditorRef } from 'react-avatar-editor';

/** Khung cắt vuông (hiển thị tròn); ảnh xuất ra đúng cỡ này nên nhẹ, đủ nét cho avatar 160px. */
const CROP_SIZE = 250;
const CROP_BORDER = 20;
const MIN_SCALE = 1;
const MAX_SCALE = 3;
const DEFAULT_SCALE = 1.2;
const OUTPUT_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.9;

interface AvatarCropModalProps {
  /** Ảnh vừa chọn; null = đóng modal. */
  file: File | null;
  onCancel: () => void;
  /** Ảnh đã cắt (JPEG), chưa gửi lên Server. */
  onCropped: (file: File) => void;
}

/** Nội dung modal: tách riêng để mỗi lần mở (destroyOnHidden) tỉ lệ phóng to về mặc định. */
const CropEditor = ({ file, onCancel, onCropped }: { file: File } & Omit<AvatarCropModalProps, 'file'>) => {
  const editorRef = useRef<AvatarEditorRef>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);

  const handleUse = () => {
    editorRef.current?.getImageScaledToCanvas().toBlob(
      (blob) => {
        if (blob) onCropped(new File([blob], 'avatar.jpg', { type: OUTPUT_TYPE }));
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <AvatarEditor
        ref={editorRef}
        image={file}
        width={CROP_SIZE}
        height={CROP_SIZE}
        border={CROP_BORDER}
        borderRadius={CROP_SIZE / 2}
        scale={scale}
      />
      <div className="w-full px-2">
        <div className="mb-1 text-sm text-text-secondary">Phóng to / thu nhỏ — kéo ảnh để chọn vùng hiển thị</div>
        <Slider
          min={MIN_SCALE}
          max={MAX_SCALE}
          step={0.1}
          value={scale}
          onChange={setScale}
          tooltip={{ formatter: (value) => `${value}×` }}
          aria-label="Phóng to ảnh"
        />
      </div>
      <div className="flex w-full justify-end gap-2">
        <Button onClick={onCancel}>Hủy</Button>
        <Button type="primary" onClick={handleUse}>
          Dùng ảnh này
        </Button>
      </div>
    </div>
  );
};

/** Cắt và phóng to ảnh đại diện trước khi lưu (như AvatarEditorModal hệ thống cũ). */
export const AvatarCropModal = ({ file, onCancel, onCropped }: AvatarCropModalProps) => (
  <Modal
    open={file !== null}
    title="Chỉnh sửa ảnh đại diện"
    footer={null}
    onCancel={onCancel}
    width={{ xs: '94%', sm: 400 }}
    centered
    destroyOnHidden
  >
    {file && <CropEditor file={file} onCancel={onCancel} onCropped={onCropped} />}
  </Modal>
);
