import {
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import type { InputHTMLAttributes } from 'react';

export function Card({
  children,
  className = '',
  'data-testid': testId,
}: {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-base font-semibold">{children}</h2>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 disabled:bg-slate-300 dark:disabled:bg-slate-700',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-slate-800',
  danger:
    'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-slate-800',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: InputButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-12 rounded-xl px-4 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

interface InputButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Formularfeld mit Label, optionalem Hinweis und Fehlermeldung (ARIA-verknüpft). */
export function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">(optional)</span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="mb-1 text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {children(id, describedBy)}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-900';

export function TextInput({
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={`${inputClass} ${invalid ? 'border-rose-500 dark:border-rose-500' : ''}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-24`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}

interface ScaleInputProps {
  label: string;
  value: number | null;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
  lowLabel: string;
  highLabel: string;
  optional?: boolean;
}

/** Bewertung 1–5 als große Touch-Buttons (Radiogroup). */
export function ScaleInput({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  optional,
}: ScaleInputProps) {
  const id = useId();
  return (
    <fieldset className="mb-4">
      <legend id={id} className="mb-1 block text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">(optional)</span>
        )}
      </legend>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${n} von 5`}
            onClick={() => onChange(n)}
            className={`min-h-12 flex-1 rounded-xl border text-base font-medium transition-colors ${
              value === n
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </fieldset>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg dark:bg-slate-900">
        <h2 id="confirm-title" className="mb-2 text-lg font-semibold">
          {title}
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
      <p className="mb-1 font-medium">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
    </div>
  );
}
