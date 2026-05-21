import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { IconDownload, IconLogout, IconUpload, IconUser } from "./Icon";

interface Props {
  onImport: () => void;
  onExport: () => void | Promise<void>;
  onSignOut: () => void;
  onClearAllData: () => void;
  onDeleteAccount: () => void;
  onLock: () => void;
}

/**
 * Avatar + dropdown shown in the top-right of the app shell. Surfaces
 * import/export, "lock vault now", sign-out, and the destructive
 * "clear all my data" and "delete account" actions.
 */
export default function UserMenu({
  onImport,
  onExport,
  onSignOut,
  onClearAllData,
  onDeleteAccount,
  onLock,
}: Props) {
  const { user, sessionExpiresAt } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName?.[0] ?? user.email?.[0] ?? "U").toUpperCase();
  const daysLeft = sessionExpiresAt
    ? Math.max(0, Math.ceil((sessionExpiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn-ghost !px-2 !py-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title={user.email ?? "Account"}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="h-7 w-7 rounded-full border border-slate-200 object-cover dark:border-slate-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-xs font-semibold text-slate-950">
            {initial}
          </div>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-glow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 px-2 pb-2 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <IconUser size={16} />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">
                  {user.displayName ?? "Signed in"}
                </div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {user.email ?? user.providerId}
                </div>
              </div>
            </div>
            {daysLeft !== null && (
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Session expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}
              </div>
            )}
          </div>
          <MenuItem
            onClick={() => {
              setOpen(false);
              onImport();
            }}
            icon={<IconUpload size={14} />}
            label="Import all data backup"
          />
          <MenuItem
            onClick={() => {
              setOpen(false);
              void onExport();
            }}
            icon={<IconDownload size={14} />}
            label="Export all data backup"
          />
          <MenuItem
            onClick={() => {
              setOpen(false);
              onLock();
            }}
            icon={<IconLogout size={14} />}
            label="Lock vault now"
          />
          <MenuItem
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            icon={<IconLogout size={14} />}
            label="Sign out"
          />
          <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
          <button
            type="button"
            role="menuitem"
            className="btn-ghost w-full justify-start !text-rose-600 hover:!bg-rose-50 dark:!text-rose-300 dark:hover:!bg-rose-900/40"
            onClick={() => {
              setOpen(false);
              onClearAllData();
            }}
          >
            Reset vault (deletes all data)
          </button>
          <button
            type="button"
            role="menuitem"
            className="btn-ghost w-full justify-start !text-rose-600 hover:!bg-rose-50 dark:!text-rose-300 dark:hover:!bg-rose-900/40"
            onClick={() => {
              setOpen(false);
              onDeleteAccount();
            }}
          >
            Delete account
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="btn-ghost w-full justify-start"
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}
