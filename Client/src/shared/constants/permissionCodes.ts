/**
 * Mã quyền, giữ đồng bộ với Server/Shared/Constants/PermissionCodes.cs.
 * Client chỉ dùng để ẩn/hiện chức năng; Server mới là nơi kiểm tra thật.
 */
export const PERMISSION_CODES = {
  employees: {
    view: 'employees.view',
    create: 'employees.create',
    update: 'employees.update',
    delete: 'employees.delete',
  },
  users: {
    view: 'users.view',
    create: 'users.create',
    update: 'users.update',
    resetPassword: 'users.reset-password',
  },
  roles: {
    view: 'roles.view',
    manage: 'roles.manage',
  },
  pages: {
    manage: 'pages.manage',
  },
  orgChart: {
    view: 'org-chart.view',
  },
  orgUnits: {
    manage: 'org-units.manage',
  },
  assignments: {
    view: 'assignments.view',
    manage: 'assignments.manage',
  },
  documents: {
    view: 'documents.view',
    issue: 'documents.issue',
    manage: 'documents.manage',
  },
  documentTemplates: {
    manage: 'document-templates.manage',
  },
  equipments: {
    manage: 'equipments.manage',
  },
  incidents: {
    analyze: 'incidents.analyze',
    manage: 'incidents.manage',
  },
} as const;
