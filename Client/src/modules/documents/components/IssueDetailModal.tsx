import { AutoComplete, Checkbox, Input, Modal } from 'antd';
import { useState } from 'react';
import { toApiError } from '@/shared/api/axiosClient';
import dayjs from '@/shared/utils/dayjs';
import { toIsoDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { IssueButton } from '@/modules/documents/components/IssueButton';
import {
  ACCEPTANCE_SHORT_NAME_SUFFIX,
  CONTRACTOR_PREFIX,
  DEFAULT_ACCEPTANCE_SHORT_NAME,
} from '@/modules/documents/constants/issueMethods';
import { useContractNumbers } from '@/modules/documents/hooks/useDocumentQueries';
import type {
  DocumentTemplateOption,
  IssueDocumentPayload,
  IssueMethod,
} from '@/modules/documents/types/documents';

type DetailIssueMethod = Exclude<IssueMethod, 'standard'>;

interface DetailFormState {
  contractNumber: string;
  shortName: string;
  prNumber: string;
  contractor: string;
  /** Năm ký hợp đồng (chuỗi như ô nhập cũ), chỉ dùng khi isNew. */
  year: string;
  isNew: boolean;
  subject: string;
}

type DetailField = Exclude<keyof DetailFormState, 'isNew'>;
type FieldErrors = Partial<Record<DetailField, string>>;

const REQUIRED_MESSAGE = 'Vui lòng nhập trường này';
const MIN_CONTRACT_YEAR = 2000;
const MAX_CONTRACT_YEAR = 2100;

const createInitialState = (method: DetailIssueMethod): DetailFormState => ({
  contractNumber: '',
  shortName: '',
  prNumber: '',
  // Xác nhận kỹ thuật: ô nhà thầu luôn có sẵn tiền tố "HPDQ-" (như hệ thống cũ)
  contractor: method === 'technicalConfirmation' ? CONTRACTOR_PREFIX : '',
  year: String(dayjs().year()),
  isNew: true,
  subject: '',
});

/** Các ô bắt buộc theo từng loại phiếu (giống payload truyền vào validate() hệ thống cũ). */
const getRequiredFields = (method: DetailIssueMethod, isNew: boolean): DetailField[] => {
  switch (method) {
    case 'acceptanceRecord':
      return ['contractNumber', 'shortName', 'subject'];
    case 'technicalConfirmation':
      return ['prNumber', 'contractor', 'subject'];
    case 'technicalPlan':
      return ['contractor', 'subject'];
    case 'contractPayment':
      return isNew ? ['contractNumber', 'year', 'subject'] : ['contractNumber', 'subject'];
  }
};

const validate = (method: DetailIssueMethod, values: DetailFormState): FieldErrors => {
  const errors: FieldErrors = {};
  getRequiredFields(method, values.isNew).forEach((field) => {
    if (!values[field].trim()) errors[field] = REQUIRED_MESSAGE;
  });
  if (method === 'technicalConfirmation' && values.contractor.trim().replace(/^HPDQ-?/i, '') === '') {
    errors.contractor = REQUIRED_MESSAGE;
  }
  if (method === 'contractPayment' && values.isNew && !errors.year) {
    const year = Number(values.year);
    if (!Number.isInteger(year) || year < MIN_CONTRACT_YEAR || year > MAX_CONTRACT_YEAR) {
      errors.year = 'Vui lòng nhập năm ký hợp đồng hợp lệ!';
    }
  }
  return errors;
};

/** Tên viết tắt luôn kết thúc bằng "-NM.CĐ2"; để trống thì dùng "BM-NM.CĐ2". */
const normalizeShortName = (value: string) => {
  const shortName = value.trim();
  if (!shortName) return DEFAULT_ACCEPTANCE_SHORT_NAME;
  return shortName.endsWith(ACCEPTANCE_SHORT_NAME_SUFFIX) ? shortName : `${shortName}${ACCEPTANCE_SHORT_NAME_SUFFIX}`;
};

/** Luôn có tiền tố "HPDQ-" ở đầu tên nhà thầu, không bị lặp. */
const withContractorPrefix = (value: string) => `${CONTRACTOR_PREFIX}${value.trim().replace(/^HPDQ-?/i, '')}`;

const buildPayload = (method: DetailIssueMethod, templateId: number, values: DetailFormState): IssueDocumentPayload => {
  const base = { documentTemplateId: templateId, subject: values.subject.trim(), issueDate: toIsoDate(dayjs()) ?? '' };
  const contractNumber = values.contractNumber.trim();

  switch (method) {
    case 'acceptanceRecord':
      return { method, request: { ...base, contractNumber, shortName: normalizeShortName(values.shortName) } };
    case 'technicalConfirmation':
      return {
        method,
        request: { ...base, prNumber: values.prNumber.trim(), contractor: withContractorPrefix(values.contractor) },
      };
    case 'technicalPlan':
      return { method, request: { ...base, contractor: values.contractor.trim() } };
    case 'contractPayment':
      return {
        method,
        request: {
          ...base,
          contractNumber,
          isNew: values.isNew,
          // Chỉ gửi năm khi là hợp đồng mới, ngược lại Server lấy năm theo lần cấp trước
          year: values.isNew ? Number(values.year) : undefined,
        },
      };
  }
};

// ----- Ô nhập (giống InputField hệ thống cũ) -----

interface FieldProps {
  name: DetailField;
  label: string;
  placeholder: string;
  values: DetailFormState;
  errors: FieldErrors;
  onChange: (name: DetailField, value: string) => void;
  onFocus: () => void;
}

const FieldLabel = ({ htmlFor, children }: { htmlFor: string; children: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold">
    {children}
  </label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <small className="mt-1 text-[11px] text-red-500 italic">{message}</small> : null;

const TextField = ({ name, label, placeholder, values, errors, onChange, onFocus }: FieldProps) => (
  <div className="flex flex-col gap-1">
    <FieldLabel htmlFor={`detail-${name}`}>{label}</FieldLabel>
    <div className="relative mb-2 flex w-full flex-col transition-all duration-200">
      <Input
        id={`detail-${name}`}
        value={values[name]}
        placeholder={placeholder}
        status={errors[name] ? 'error' : ''}
        onChange={(event) => onChange(name, event.target.value)}
        onFocus={onFocus}
        className="rounded-md border border-solid border-gray-300 text-[14px] placeholder:text-gray-400 focus:shadow-none focus:outline-none"
      />
      <FieldError message={errors[name]} />
    </div>
  </div>
);

// ----- Phiếu -----

interface IssueDetailFormProps {
  template: DocumentTemplateOption;
  method: DetailIssueMethod;
  isSubmitting: boolean;
  onSubmit: (payload: IssueDocumentPayload) => Promise<unknown>;
}

const IssueDetailForm = ({ template, method, isSubmitting, onSubmit }: IssueDetailFormProps) => {
  const [values, setValues] = useState(() => createInitialState(method));
  const [errors, setErrors] = useState<FieldErrors>({});
  const isContractPayment = method === 'contractPayment';
  const { data: contractNumbers = [] } = useContractNumbers(template.id, isContractPayment);

  const handleChange = (name: DetailField, value: string) => {
    // Xác nhận kỹ thuật: xóa lẹm vào tiền tố thì tự gắn lại "HPDQ-"
    // (không trim lúc đang gõ để vẫn nhập được dấu cách trong tên)
    const nextValue =
      method === 'technicalConfirmation' && name === 'contractor' && !value.startsWith(CONTRACTOR_PREFIX)
        ? `${CONTRACTOR_PREFIX}${value.replace(/^HPDQ-?/i, '')}`
        : value;
    setValues((previous) => ({ ...previous, [name]: nextValue }));
  };

  // Như hệ thống cũ: focus vào ô bất kỳ thì ẩn hết lỗi
  const handleFocus = () => setErrors({});

  const handleSubmit = async () => {
    const validationErrors = validate(method, values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit(buildPayload(method, template.id, values));
    } catch (error) {
      // Lỗi theo field từ Server (vd số hợp đồng) hiện dưới ô tương ứng, còn lại báo toast
      const fieldErrors = Object.entries(toApiError(error).errors ?? {}).filter(([field]) => field in values);
      if (fieldErrors.length > 0) {
        setErrors(Object.fromEntries(fieldErrors.map(([field, messages]) => [field, messages[0]])));
      } else {
        notify.apiError(error);
      }
    }
  };

  const fieldProps = { values, errors, onChange: handleChange, onFocus: handleFocus };

  return (
    <div className="flex flex-col gap-3">
      {/* Hồ sơ nghiệm thu */}
      {method === 'acceptanceRecord' && (
        <>
          <TextField name="contractNumber" label="Số hợp đồng" placeholder="Nhập số hợp đồng..." {...fieldProps} />
          <TextField name="shortName" label="Tên viết tắt" placeholder="Nhập tên viết tắt của biểu mẫu..." {...fieldProps} />
        </>
      )}

      {/* Xác nhận kỹ thuật */}
      {method === 'technicalConfirmation' && (
        <>
          <TextField name="prNumber" label="Số PR" placeholder="Nhập số PR..." {...fieldProps} />
          <TextField name="contractor" label="Nhà thầu" placeholder="Nhập tên nhà thầu..." {...fieldProps} />
        </>
      )}

      {/* Phương án kỹ thuật */}
      {method === 'technicalPlan' && (
        <TextField name="contractor" label="Nhà thầu" placeholder="Nhập tên nhà thầu..." {...fieldProps} />
      )}

      {/* Biên bản xác nhận khối lượng thanh toán công đoạn */}
      {isContractPayment && (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={values.isNew}
              onChange={(event) => {
                // Đổi chế độ thì nhập lại số hợp đồng
                setValues((previous) => ({ ...previous, isNew: event.target.checked, contractNumber: '' }));
                setErrors({});
              }}
            >
              <span className="text-sm font-semibold">Mới</span>
            </Checkbox>
          </div>

          {values.isNew ? (
            <TextField
              key="contract-number-input"
              name="contractNumber"
              label="Số hợp đồng"
              placeholder="Nhập số hợp đồng..."
              {...fieldProps}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="detail-contractNumber">Số hợp đồng</FieldLabel>
              <div className="mb-2 flex flex-col">
                <AutoComplete
                  key="contract-number-select"
                  id="detail-contractNumber"
                  value={values.contractNumber}
                  onSelect={(value: string) => handleChange('contractNumber', value)}
                  onChange={(value: string) => handleChange('contractNumber', value)}
                  onFocus={handleFocus}
                  status={errors.contractNumber ? 'error' : ''}
                  placeholder="Chọn số hợp đồng đã lấy..."
                  className="h-[33px] w-full"
                  options={contractNumbers.map((contractNumber) => ({ value: contractNumber, label: contractNumber }))}
                  showSearch={{
                    filterOption: (input, option) =>
                      String(option?.value ?? '').toLowerCase().includes(input.toLowerCase()),
                  }}
                  notFoundContent={contractNumbers.length === 0 ? 'Chưa có số hợp đồng nào' : null}
                />
                <FieldError message={errors.contractNumber} />
              </div>
            </div>
          )}

          {/* Năm - chỉ hiện khi Mới */}
          {values.isNew && (
            <TextField key="year-field" name="year" label="Năm" placeholder="Nhập năm ký hợp đồng..." {...fieldProps} />
          )}
        </>
      )}

      {/* Nội dung trích yếu (mọi loại phiếu) */}
      <TextField name="subject" label="Nội dung trích yếu" placeholder="Nhập nội dung trích yếu..." {...fieldProps} />

      <div className="mt-3 flex justify-end">
        <IssueButton onClick={handleSubmit} isLoading={isSubmitting} className="h-11 rounded-md px-5 md:h-[33px]">
          Lấy số
        </IssueButton>
      </div>
    </div>
  );
};

interface IssueDetailModalProps {
  template: DocumentTemplateOption | null;
  method: IssueMethod;
  isSubmitting: boolean;
  onSubmit: (payload: IssueDocumentPayload) => Promise<unknown>;
  onCancel: () => void;
}

/** "Phiếu điền thông tin lấy số" cho biểu mẫu đánh số đặc biệt (nghiệm thu, XNKT, PAKT, thanh toán HĐ). */
export const IssueDetailModal = ({ template, method, isSubmitting, onSubmit, onCancel }: IssueDetailModalProps) => (
  <Modal
    open={Boolean(template) && method !== 'standard'}
    title={<div className="w-full text-center text-[18px] font-semibold text-primary">Phiếu điền thông tin lấy số</div>}
    centered
    onCancel={onCancel}
    mask={{ closable: !isSubmitting }}
    footer={null}
    destroyOnHidden
    width={{ xs: '94%', sm: 520 }}
  >
    {template && method !== 'standard' && (
      <IssueDetailForm
        key={`${template.id}-${method}`}
        template={template}
        method={method}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    )}
  </Modal>
);
