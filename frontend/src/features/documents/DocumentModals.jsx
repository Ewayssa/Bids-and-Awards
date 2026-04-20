// Barrel file for document-related modals.
// Keeps individual modal implementations in their own files
// but gives the rest of the app a single import surface.

export { default as EncodeModal } from './modals/EncodeModal';
export { default as UpdateDocumentModal } from './modals/UpdateDocumentModal';
export { default as UpdateChecklistModal } from './modals/UpdateChecklistModal';

export { default as UploadModal } from './modals/UploadModal';
export { default as DocViewModal } from './modals/DocViewModal';
export { default as PreviewModal } from './modals/PreviewModal';
export { default as CommentModal } from './modals/CommentModal';
export { default as WorkflowModal } from './modals/WorkflowModal';
export { default as AlertModal } from './modals/AlertModal';
export { default as ConfirmDialog } from './modals/ConfirmDialog';

// New procurement workflow modals
export { default as NewProcurementRecordModal } from './modals/NewProcurementRecordModal';
export { default as ProcurementDocumentModal } from './modals/ProcurementDocumentModal';

