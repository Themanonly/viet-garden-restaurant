'use client';

import React, { useEffect, useRef } from 'react';

type DestructiveActionDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  warning?: string;
  dependencyMessage?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DestructiveActionDialog({
  open,
  title,
  description,
  warning,
  dependencyMessage,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: DestructiveActionDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    const timeoutId = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="admin-destructive-overlay" role="presentation" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="admin-destructive-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-destructive-dialog-title"
        aria-describedby="admin-destructive-dialog-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-destructive-header">
          <p className="admin-eyebrow">Destructive action</p>
          <h2 id="admin-destructive-dialog-title">{title}</h2>
        </div>

        <div className="admin-destructive-body">
          {description ? <p id="admin-destructive-dialog-description">{description}</p> : null}
          {dependencyMessage ? <p className="admin-destructive-warning">{dependencyMessage}</p> : null}
          {warning ? <p className="admin-destructive-warning is-strong">{warning}</p> : null}
        </div>

        <div className="admin-destructive-actions">
          <button type="button" className="admin-secondary-button" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="admin-primary-button is-danger"
            onClick={onConfirm}
            disabled={confirmDisabled || isSubmitting}
            aria-disabled={confirmDisabled || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
