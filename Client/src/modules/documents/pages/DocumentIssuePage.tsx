import { Empty, Skeleton } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ErrorState } from '@/shared/components/ErrorState';
import { PAGE_PARAM, Pagination } from '@/shared/components/Pagination';
import { RibbonTitle } from '@/shared/components/RibbonTitle';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { showLoginRequiredAlert } from '@/shared/utils/alert';
import dayjs from '@/shared/utils/dayjs';
import { toIsoDate } from '@/shared/utils/format';
import { notify } from '@/shared/utils/notify';
import { buildLoginPath } from '@/shared/utils/redirect';
import { useAuthStore } from '@/stores/authStore';
import { IssueDetailModal } from '@/modules/documents/components/IssueDetailModal';
import { IssueDocumentBar } from '@/modules/documents/components/IssueDocumentBar';
import { IssuedDocumentTable } from '@/modules/documents/components/IssuedDocumentTable';
import { TemplateSlider } from '@/modules/documents/components/TemplateSlider';
import {
  getIssueMethod,
  isStandardIssueMethod,
  ISSUED_DOCUMENT_PAGE_SIZE,
} from '@/modules/documents/constants/issueMethods';
import { useDocumentTemplateOptions, useIssuedDocuments } from '@/modules/documents/hooks/useDocumentQueries';
import { useIssueDocument } from '@/modules/documents/hooks/useIssueDocument';
import type {
  DocumentTemplateOption,
  IssueDocumentPayload,
  IssueResult,
  SelectedTemplate,
  TemplateSliderInstance,
} from '@/modules/documents/types/documents';
import { showIssueResultAlert } from '@/modules/documents/utils/issueResultAlert';

/** Mã nhân viên đang tìm trên URL (?q=), như hệ thống cũ. */
const EMP_CODE_PARAM = 'q';
const SEARCH_DEBOUNCE_MS = 800;
const EMPTY_SELECTION: SelectedTemplate = { text: '' };

/**
 * Lấy số văn bản (route /documents/issue, trang công khai mặc định), dựng lại theo LaySo hệ thống cũ.
 * Ai cũng xem được sổ văn bản; lấy số cần đăng nhập và quyền documents.issue (Server kiểm tra).
 */
const DocumentIssuePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const authStatus = useAuthStore((state) => state.status);
  const sliderRef = useRef<TemplateSliderInstance>(null);

  const templatesQuery = useDocumentTemplateOptions();
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);
  const issueMutation = useIssueDocument();

  // ----- Sổ văn bản: tab biểu mẫu + ?page + ?q -----
  const [activeTab, setActiveTab] = useState<number>();
  // Chưa chọn tab thì mặc định biểu mẫu đầu tiên
  const activeTemplateId = templates.find((template) => template.id === activeTab)?.id ?? templates[0]?.id;
  const pageIndex = Number(searchParams.get(PAGE_PARAM)) || 1;
  const issuerEmpCode = searchParams.get(EMP_CODE_PARAM) ?? '';

  const [empCodeInput, setEmpCodeInput] = useState(issuerEmpCode);
  const debouncedEmpCode = useDebouncedValue(empCodeInput.trim(), SEARCH_DEBOUNCE_MS);

  /** Về trang 1, giữ lại ô tìm kiếm (và đổi q nếu truyền vào). */
  const resetToFirstPage = (empCode = issuerEmpCode) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set(PAGE_PARAM, '1');
        if (empCode) next.set(EMP_CODE_PARAM, empCode);
        else next.delete(EMP_CODE_PARAM);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    if (debouncedEmpCode !== issuerEmpCode) resetToFirstPage(debouncedEmpCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi người dùng ngừng gõ
  }, [debouncedEmpCode]);

  const documentsQuery = useIssuedDocuments(
    {
      documentTemplateId: activeTemplateId,
      issuerEmpCode: issuerEmpCode || undefined,
      pageIndex,
      pageSize: ISSUED_DOCUMENT_PAGE_SIZE,
    },
    activeTemplateId !== undefined,
  );

  /** Chọn tab biểu mẫu: lọc sổ theo biểu mẫu đó, về trang 1, cuộn slider tới nút tương ứng. */
  const goToTemplate = (templateId: number) => {
    setActiveTab(templateId);
    resetToFirstPage();
    const index = templates.findIndex((template) => template.id === templateId);
    if (index !== -1) sliderRef.current?.slickGoTo(index);
  };

  // ----- Lấy số -----
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate>(EMPTY_SELECTION);
  const [subject, setSubject] = useState('');
  const [detailTemplate, setDetailTemplate] = useState<DocumentTemplateOption | null>(null);

  /** Chưa đăng nhập: cảnh báo rồi chuyển sang đăng nhập, xong quay lại đúng trang này (như hệ thống cũ). */
  const ensureLoggedIn = () => {
    if (authStatus === 'authenticated') return true;
    if (authStatus === 'anonymous') {
      void showLoginRequiredAlert().then(() => navigate(buildLoginPath(`${location.pathname}${location.search}`)));
    }
    return false;
  };

  const resetIssueInputs = () => {
    setSelectedTemplate(EMPTY_SELECTION);
    setSubject('');
    setDetailTemplate(null);
  };

  const handleIssued = (template: DocumentTemplateOption, result: IssueResult) => {
    void showIssueResultAlert(`"${template.name}" được cấp số:`, result.documentNumber);
    goToTemplate(template.id);
    resetIssueInputs();
  };

  const handleTemplateSelect = (template: DocumentTemplateOption) => {
    setSelectedTemplate({ id: template.id, text: template.name });
    // Biểu mẫu đánh số đặc biệt: mở phiếu điền thông tin ngay khi chọn
    if (!isStandardIssueMethod(getIssueMethod(template.id))) setDetailTemplate(template);
  };

  // Gõ tay khác tên biểu mẫu đã chọn thì bỏ chọn, tránh lấy số nhầm biểu mẫu trước đó
  const handleTemplateTextChange = (text: string) =>
    setSelectedTemplate((previous) => ({ text, id: previous.text === text ? previous.id : undefined }));

  const handleIssueStandard = async () => {
    if (!ensureLoggedIn()) return;

    const template = templates.find((item) => item.id === selectedTemplate.id);
    if (!template) {
      notify.error('Không tìm thấy biểu mẫu đã chọn!');
      return;
    }

    try {
      const result = await issueMutation.mutateAsync({
        method: 'standard',
        request: { documentTemplateId: template.id, subject: subject.trim(), issueDate: toIsoDate(dayjs()) ?? '' },
      });
      handleIssued(template, result);
    } catch (error) {
      notify.apiError(error);
    }
  };

  /** Lỗi ném lại để phiếu tự hiện dưới ô nhập tương ứng. */
  const handleDetailSubmit = async (payload: IssueDocumentPayload) => {
    if (!detailTemplate || !ensureLoggedIn()) return;
    const result = await issueMutation.mutateAsync(payload);
    handleIssued(detailTemplate, result);
  };

  const handleDetailCancel = () => {
    setDetailTemplate(null);
    setSelectedTemplate(EMPTY_SELECTION);
  };

  // ----- Hiển thị -----
  const renderDocuments = () => {
    if (templatesQuery.isPending) return <Skeleton active paragraph={{ rows: 8 }} className="mt-4" />;
    if (templatesQuery.isError) {
      return <ErrorState error={templatesQuery.error} onRetry={() => templatesQuery.refetch()} />;
    }
    if (templates.length === 0) return <Empty className="py-10" description="Chưa có biểu mẫu văn bản nào." />;

    return (
      <>
        <TemplateSlider
          sliderRef={sliderRef}
          templates={templates}
          activeTemplateId={activeTemplateId}
          onChange={goToTemplate}
        />
        <div className="lg:h-[755px]">
          {documentsQuery.isError ? (
            <ErrorState error={documentsQuery.error} onRetry={() => documentsQuery.refetch()} />
          ) : (
            <IssuedDocumentTable
              documents={documentsQuery.data?.items ?? []}
              pageIndex={pageIndex}
              pageSize={ISSUED_DOCUMENT_PAGE_SIZE}
              isLoading={documentsQuery.isFetching}
            />
          )}
        </div>
        <div className="mt-3 w-full">
          <Pagination totalCount={documentsQuery.data?.totalCount ?? 0} pageSize={ISSUED_DOCUMENT_PAGE_SIZE} />
        </div>
      </>
    );
  };

  return (
    <div className="mt-2 flex w-full flex-col">
      <RibbonTitle title="LẤY SỐ VĂN BẢN" />

      <IssueDocumentBar
        templates={templates}
        selectedTemplate={selectedTemplate}
        subject={subject}
        issuerEmpCode={empCodeInput}
        isSubmitting={issueMutation.isPending && !detailTemplate}
        onTemplateSelect={handleTemplateSelect}
        onTemplateTextChange={handleTemplateTextChange}
        onTemplateClear={() => setSelectedTemplate(EMPTY_SELECTION)}
        onSubjectChange={setSubject}
        onIssuerEmpCodeChange={setEmpCodeInput}
        onIssue={handleIssueStandard}
      />

      <div className="mt-1">{renderDocuments()}</div>

      <IssueDetailModal
        template={detailTemplate}
        method={detailTemplate ? getIssueMethod(detailTemplate.id) : 'standard'}
        isSubmitting={issueMutation.isPending}
        onSubmit={handleDetailSubmit}
        onCancel={handleDetailCancel}
      />
    </div>
  );
};

export default DocumentIssuePage;
