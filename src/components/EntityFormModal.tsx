import type { ReactNode } from "react";
import Modal from "./Modal";
import { IconCheck, IconPlus, IconSpinner, IconX } from "./Icon";

interface Props {
  open: boolean;
  /** Whether we're editing an existing entity (vs. adding a new one). */
  isEdit: boolean;
  /** True while the submit is in flight; disables the buttons and shows a spinner. */
  saving: boolean;
  /** Lower-case entity noun, e.g. "credential" or "URL", used in the title and button. */
  entityLabel: string;
  /** `id` of the form the submit button drives (the form lives in `children`). */
  formId: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Shared "add / edit" modal shell for the credential and URL forms. Owns the
 * title and the Cancel/Submit footer so the two call sites don't duplicate the
 * identical button markup; the actual form fields are passed as children and
 * submit via the native `form` attribute.
 */
export default function EntityFormModal({
  open,
  isEdit,
  saving,
  entityLabel,
  formId,
  onClose,
  children,
}: Props) {
  return (
    <Modal
      open={open}
      title={`${isEdit ? "Edit" : "Add"} ${entityLabel}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            <IconX size={16} />
            <span>Cancel</span>
          </button>
          <button type="submit" form={formId} className="btn-primary" disabled={saving}>
            {saving ? (
              <IconSpinner size={14} />
            ) : isEdit ? (
              <IconCheck size={16} />
            ) : (
              <IconPlus size={16} />
            )}
            <span>
              {saving
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save changes"
                  : `Add ${entityLabel}`}
            </span>
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
