import { InboxOutlined } from '@ant-design/icons';
import { Alert, Form, Input, InputNumber, Modal, Radio, Upload, type UploadFile } from 'antd';
import { useState } from 'react';
import { notify } from '@/shared/utils/notify';
import { useImportEquipments } from '@/modules/equipments/hooks/useEquipmentQueries';
import type { EquipmentImportResult } from '@/modules/equipments/types/equipments';

type ImportMode = 'default' | 'custom';

interface EquipmentImportFormValues {
  mode: ImportMode;
  sheetName?: string;
  startRow?: number;
  codeColumn?: number;
  nameColumn?: number;
}

interface EquipmentImportModalProps {
  open: boolean;
  onClose: () => void;
}

const EXCEL_ACCEPT = '.xlsx,.xlsm';
const MAX_FILE_SIZE_MB = 20;
const MAX_ERRORS_SHOWN = 50;

const INITIAL_VALUES: EquipmentImportFormValues = { mode: 'default', startRow: 2, codeColumn: 1, nameColumn: 2 };

/**
 * Import danh mục thiết bị từ Excel. "File danh mục gốc": Server đọc 4 sheet "THAM CHIẾU EQ - …" cố định;
 * "Tự khai báo": 1 sheet với dòng bắt đầu và cột mã / tên. Mã đã có hoặc lặp trong file được bỏ qua.
 * Import xong giữ modal mở để xem kết quả và lỗi từng dòng.
 */
export const EquipmentImportModal = ({ open, onClose }: EquipmentImportModalProps) => {
  const [form] = Form.useForm<EquipmentImportFormValues>();
  const mode = Form.useWatch('mode', form) ?? INITIAL_VALUES.mode;
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<EquipmentImportResult>();
  const importMutation = useImportEquipments();

  const handleBeforeUpload = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      notify.error(`File tối đa ${MAX_FILE_SIZE_MB}MB.`);
      return Upload.LIST_IGNORE;
    }
    setFileList([{ uid: String(Date.now()), name: file.name, originFileObj: file as UploadFile['originFileObj'] }]);
    setResult(undefined);
    // Không tự tải lên: chỉ gửi khi bấm Import
    return false;
  };

  const handleSubmit = async () => {
    let values: EquipmentImportFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const file = fileList[0]?.originFileObj;
    if (!file) {
      notify.warning('Chọn file Excel cần import.');
      return;
    }

    try {
      const importResult = await importMutation.mutateAsync({
        file,
        configs:
          values.mode === 'custom'
            ? [
                {
                  sheetName: values.sheetName?.trim() ?? '',
                  startRow: values.startRow ?? 2,
                  codeColumn: values.codeColumn ?? 1,
                  nameColumn: values.nameColumn ?? 0,
                },
              ]
            : undefined,
      });
      setResult(importResult);
      notify.success(`Thêm mới ${importResult.insertedCount}, bỏ qua ${importResult.skippedCount} mã đã có.`);
    } catch (error) {
      notify.apiError(error);
    }
  };

  const handleClose = () => {
    setFileList([]);
    setResult(undefined);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Import thiết bị từ Excel"
      okText="Import"
      cancelText="Đóng"
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={importMutation.isPending}
      mask={{ closable: false }}
      width={{ xs: '94%', sm: 640 }}
      centered
      destroyOnHidden
    >
      <Form<EquipmentImportFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={INITIAL_VALUES}
        className="pt-1"
      >
        <Form.Item name="mode" label="Kiểu file">
          <Radio.Group
            options={[
              { label: 'File danh mục gốc', value: 'default' },
              { label: 'Tự khai báo sheet', value: 'custom' },
            ]}
          />
        </Form.Item>

        {mode === 'default' ? (
          <Alert
            type="info"
            showIcon
            className="mb-4"
            message='Đọc 4 sheet "THAM CHIẾU EQ - XLG1 / XLG2 / XNĐ1 / XNĐ2": cột A là mã, cột B là tên.'
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="sheetName"
              label="Tên sheet"
              rules={[{ required: true, whitespace: true, message: 'Nhập tên sheet' }]}
              className="sm:col-span-2"
            >
              <Input placeholder="VD: Sheet1" />
            </Form.Item>
            <Form.Item
              name="startRow"
              label="Dòng bắt đầu"
              rules={[{ required: true, message: 'Nhập dòng bắt đầu' }]}
              tooltip="Dòng đầu tiên có dữ liệu (bỏ qua dòng tiêu đề)."
            >
              <InputNumber min={1} precision={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="codeColumn"
              label="Cột mã thiết bị"
              rules={[{ required: true, message: 'Nhập cột mã' }]}
              tooltip="Đánh số từ 1: A = 1, B = 2…"
            >
              <InputNumber min={1} precision={0} className="w-full" />
            </Form.Item>
            <Form.Item name="nameColumn" label="Cột tên thiết bị" tooltip="Đánh số từ 1: A = 1, B = 2… 0 = không đọc tên.">
              <InputNumber min={0} precision={0} className="w-full" />
            </Form.Item>
          </div>
        )}

        <Form.Item label="File Excel" required className="mb-0">
          <Upload.Dragger
            accept={EXCEL_ACCEPT}
            maxCount={1}
            fileList={fileList}
            beforeUpload={handleBeforeUpload}
            onRemove={() => {
              setFileList([]);
              setResult(undefined);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Bấm hoặc kéo file vào đây</p>
            <p className="ant-upload-hint">File .xlsx hoặc .xlsm, tối đa {MAX_FILE_SIZE_MB}MB</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>

      {result && (
        <Alert
          type={result.errors.length > 0 ? 'warning' : 'success'}
          showIcon
          className="mt-4"
          message={`Đọc ${result.totalRows} dòng: thêm mới ${result.insertedCount}, bỏ qua ${result.skippedCount} mã đã có, ${result.errors.length} lỗi.`}
          description={
            result.errors.length > 0 && (
              <ul className="m-0 max-h-48 overflow-y-auto pl-4">
                {result.errors.slice(0, MAX_ERRORS_SHOWN).map((error) => (
                  <li key={error}>{error}</li>
                ))}
                {result.errors.length > MAX_ERRORS_SHOWN && (
                  <li>… và {result.errors.length - MAX_ERRORS_SHOWN} lỗi khác</li>
                )}
              </ul>
            )
          }
        />
      )}
    </Modal>
  );
};
