import { useEffect, useId, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Native dialog provides Escape handling, backdrop, and modal focus containment. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!confirmDisabled) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !confirmDisabled) onCancel();
      }}
    >
      <div className="confirm-dialog__body">
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="confirm-dialog__actions">
          <button
            className="btn"
            type="button"
            autoFocus
            disabled={confirmDisabled}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn--danger"
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
