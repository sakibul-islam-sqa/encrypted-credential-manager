import { useState } from "react";
import type { CredentialEntry, Vault } from "../types";
import { uid as makeId } from "../lib/id";
import type { ToastApi } from "../components/Toast";
import type { ConfirmController } from "./useConfirmDialog";

type CredentialData = Omit<CredentialEntry, "id" | "createdAt" | "updatedAt">;

interface UseCredentialsArgs {
  persist: (updater: (v: Vault) => Vault) => Promise<void>;
  toast: ToastApi;
  confirm: ConfirmController;
}

export interface CredentialsController {
  modalOpen: boolean;
  editing: CredentialEntry | null;
  saving: boolean;
  openAdd: () => void;
  openEdit: (entry: CredentialEntry) => void;
  close: () => void;
  handleSaveEntry: (data: CredentialData) => Promise<void>;
  askDelete: (entry: CredentialEntry) => void;
}

/**
 * Normalise form data onto a credential, treating a blank `environment` as
 * absent so we don't persist empty strings.
 */
function mergeCredentialData(
  base: CredentialEntry,
  data: CredentialData,
  updatedAt: number
): CredentialEntry {
  const merged = { ...base, ...data, updatedAt };
  const env =
    data.environment === undefined || data.environment === null
      ? undefined
      : String(data.environment).trim() || undefined;
  if (env) merged.environment = env;
  else delete merged.environment;
  return merged;
}

/** Modal + save/delete lifecycle for the credentials list. */
export function useCredentials({
  persist,
  toast,
  confirm,
}: UseCredentialsArgs): CredentialsController {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (entry: CredentialEntry) => {
    setEditing(entry);
    setModalOpen(true);
  };

  const close = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  async function handleSaveEntry(data: CredentialData) {
    const now = Date.now();
    const isEdit = !!editing;
    const editingId = editing?.id;
    setSaving(true);
    try {
      await toast.promise(
        persist((v) =>
          isEdit
            ? {
                ...v,
                entries: v.entries.map((e) =>
                  e.id === editingId ? mergeCredentialData(e, data, now) : e
                ),
              }
            : {
                ...v,
                entries: [
                  mergeCredentialData(
                    { id: makeId(), createdAt: now, updatedAt: now, app: data.app },
                    data,
                    now
                  ),
                  ...v.entries,
                ],
              }
        ),
        {
          loading: isEdit ? "Saving changes..." : "Adding credential...",
          success: isEdit ? "Credential updated" : "Credential added",
          error: "Couldn't save. Check your connection.",
        }
      );
      close();
    } catch {
      // toast already showed the error; keep the modal open so user can retry
    } finally {
      setSaving(false);
    }
  }

  function askDelete(entry: CredentialEntry) {
    confirm.ask({
      title: "Delete credential?",
      message: `This will permanently remove "${entry.app}"${
        entry.environment ? ` (${entry.environment})` : ""
      }. This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete",
      action: () =>
        toast.promise(
          persist((v) => ({
            ...v,
            entries: v.entries.filter((e) => e.id !== entry.id),
          })),
          {
            loading: "Deleting credential...",
            success: "Credential deleted",
            error: "Couldn't delete. Try again.",
          }
        ),
    });
  }

  return { modalOpen, editing, saving, openAdd, openEdit, close, handleSaveEntry, askDelete };
}
