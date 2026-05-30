import { useState } from "react";
import type { UrlEntry, Vault } from "../types";
import { uid as makeId } from "../lib/id";
import type { ToastApi } from "../components/Toast";
import type { ConfirmController } from "./useConfirmDialog";

type UrlData = Omit<UrlEntry, "id" | "createdAt" | "updatedAt">;

interface UseUrlsArgs {
  persist: (updater: (v: Vault) => Vault) => Promise<void>;
  toast: ToastApi;
  confirm: ConfirmController;
}

export interface UrlsController {
  modalOpen: boolean;
  editing: UrlEntry | null;
  saving: boolean;
  openAdd: () => void;
  openEdit: (entry: UrlEntry) => void;
  close: () => void;
  handleSaveUrl: (data: UrlData) => Promise<void>;
  askDelete: (entry: UrlEntry) => void;
}

/** Modal + save/delete lifecycle for the URLs list. */
export function useUrls({ persist, toast, confirm }: UseUrlsArgs): UrlsController {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UrlEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (entry: UrlEntry) => {
    setEditing(entry);
    setModalOpen(true);
  };

  const close = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  async function handleSaveUrl(data: UrlData) {
    const now = Date.now();
    const isEdit = !!editing;
    const editingId = editing?.id;
    setSaving(true);
    try {
      await toast.promise(
        persist((v) => {
          const current = v.urls ?? [];
          return isEdit
            ? {
                ...v,
                urls: current.map((u) =>
                  u.id === editingId ? { ...editing!, ...data, updatedAt: now } : u
                ),
              }
            : {
                ...v,
                urls: [{ id: makeId(), createdAt: now, updatedAt: now, ...data }, ...current],
              };
        }),
        {
          loading: isEdit ? "Saving URL..." : "Adding URL...",
          success: isEdit ? "URL updated" : "URL added",
          error: "Couldn't save. Check your connection.",
        }
      );
      close();
    } catch {
      // keep modal open
    } finally {
      setSaving(false);
    }
  }

  function askDelete(entry: UrlEntry) {
    confirm.ask({
      title: "Delete URL?",
      message: `This will permanently remove the ${entry.environment}${
        entry.variant ? ` / ${entry.variant}` : ""
      } URL for "${entry.app}". This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete",
      action: () =>
        toast.promise(
          persist((v) => ({
            ...v,
            urls: (v.urls ?? []).filter((u) => u.id !== entry.id),
          })),
          {
            loading: "Deleting URL...",
            success: "URL deleted",
            error: "Couldn't delete. Try again.",
          }
        ),
    });
  }

  return { modalOpen, editing, saving, openAdd, openEdit, close, handleSaveUrl, askDelete };
}
