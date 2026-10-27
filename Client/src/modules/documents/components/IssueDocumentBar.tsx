import { CloseCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { AutoComplete } from "antd";
import { IssueButton } from "@/modules/documents/components/IssueButton";
import type { DocumentTemplateOption, SelectedTemplate } from "@/modules/documents/types/documents";

interface IssueDocumentBarProps {
  templates: DocumentTemplateOption[];
  selectedTemplate: SelectedTemplate;
  subject: string;
  issuerEmpCode: string;
  isSubmitting: boolean;
  onTemplateSelect: (template: DocumentTemplateOption) => void;
  onTemplateTextChange: (text: string) => void;
  onTemplateClear: () => void;
  onSubjectChange: (subject: string) => void;
  onIssuerEmpCodeChange: (empCode: string) => void;
  onIssue: () => void;
}

const LABEL_CLASS = "text-sm font-semibold";

/**
 * Bộ lọc + nhập giống hệ thống cũ: [Văn bản] [Nội dung trích yếu] [Lấy số] ... [Tìm kiếm].
 * ≥ lg: một hàng cao 110px; nhỏ hơn: các ô xếp dọc (md: 3 ô đầu nằm ngang).
 */
export const IssueDocumentBar = ({
  templates,
  selectedTemplate,
  subject,
  isSubmitting,
  onTemplateSelect,
  onTemplateTextChange,
  onTemplateClear,
  onSubjectChange,
  onIssue,
}: IssueDocumentBarProps) => {
  const isIssueDisabled = !selectedTemplate.id || !subject.trim();

  return (
    <div className="flex w-full flex-col gap-4 border border-solid border-gray-300 bg-bg-container p-4 lg:h-[110px] lg:flex-row lg:items-center lg:justify-between lg:py-0">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* AutoComplete biểu mẫu */}
        <div className="flex flex-col gap-2">
          <label htmlFor="issue-template" className={LABEL_CLASS}>
            Văn bản
          </label>
          <div className="relative w-full md:w-[280px]">
            <AutoComplete
              id="issue-template"
              value={selectedTemplate.text}
              onSelect={(_, option) => {
                const template = templates.find(
                  (item) => item.id === option.templateId,
                );
                if (template) onTemplateSelect(template);
              }}
              onChange={onTemplateTextChange}
              placeholder="Tìm hoặc chọn văn bản..."
              // Chữ 13px như ô trích yếu; chừa lề phải cho nút xóa để chữ không chạy dưới icon
              className={`h-[33px] w-full text-[13px] [&_input]:text-[13px] ${selectedTemplate.text ? "[&_input]:pr-3" : ""}`}
              options={templates.map((template) => ({
                key: template.id,
                templateId: template.id,
                value: template.name,
                label: `${template.name} (${template.code})`,
                searchText:
                  `${template.name} ${template.code} ${template.numberSuffix}`.toLowerCase(),
              }))}
              showSearch={{
                filterOption: (input, option) =>
                  Boolean(option?.searchText.includes(input.toLowerCase())),
              }}
              suffixIcon={!selectedTemplate.text && <SearchOutlined />}
            />

            {/* Icon xóa xuất hiện khi đã chọn biểu mẫu */}
            {selectedTemplate.text && (
              <button
                type="button"
                aria-label="Bỏ chọn văn bản"
                onClick={onTemplateClear}
                className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent text-gray-400 transition-all duration-200 hover:text-red-500"
              >
                <CloseCircleOutlined />
              </button>
            )}
          </div>
        </div>

        {/* Textarea nội dung */}
        <div className="flex flex-col gap-2 md:flex-1 lg:flex-none">
          <label htmlFor="issue-subject" className={LABEL_CLASS}>
            Nội dung trích yếu
          </label>
          <textarea
            id="issue-subject"
            value={subject}
            maxLength={1000}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder="Nhập nội dung trích yếu..."
            className="h-[33px] w-full resize-none rounded-md border border-solid border-gray-300 p-2 text-[13px] placeholder:text-[12px] placeholder:text-gray-400 placeholder:italic focus:border-blue-400 focus:shadow-md focus:outline-none lg:w-[400px]"
          />
        </div>

        {/* Nút Lấy số */}
        <div className="md:mt-[20px] md:h-[33px]">
          <IssueButton
            onClick={onIssue}
            disabled={isIssueDisabled}
            isLoading={isSubmitting}
            className="h-11 w-full px-3 md:h-[34px] md:w-fit"
          >
            Lấy số
          </IssueButton>
        </div>
      </div>
    </div>
  );
};
