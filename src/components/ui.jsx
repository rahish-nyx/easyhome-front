import { createPortal } from "react-dom";
import { useEffect } from "react";
import {
  AlertCircle,
  ChevronRight,
  Inbox,
  Loader2,
  X,
} from "lucide-react";
import { avatarTone, initials, mediaUrl } from "../lib/media";
import { cx } from "../lib/format";
import { useLockBody } from "../hooks/useDevice";

/* --------------------------------- Button -------------------------------- */

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      className={cx("btn", `btn--${variant}`, `btn--${size}`, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 size={18} className="spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon size={18} aria-hidden="true" />
      ) : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  variant = "ghost",
  size = "md",
  className = "",
  badge,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("icon-btn", `icon-btn--${variant}`, `icon-btn--${size}`, className)}
      {...rest}
    >
      <Icon size={size === "lg" ? 22 : 18} aria-hidden="true" />
      {badge ? <span className="icon-btn__badge">{badge > 9 ? "9+" : badge}</span> : null}
    </button>
  );
}

/* --------------------------------- Layout -------------------------------- */

export function Card({ className = "", children, ...rest }) {
  return (
    <div className={cx("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children, className = "", dot = false }) {
  return (
    <span className={cx("badge", `badge--${tone}`, className)}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, action, className = "" }) {
  return (
    <div className={cx("section-head", className)}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {title ? <h2 className="section-head__title">{title}</h2> : null}
        {subtitle ? <p className="section-head__sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="section-head__action">{action}</div> : null}
    </div>
  );
}

export function Divider({ className = "" }) {
  return <hr className={cx("divider", className)} />;
}

/* ---------------------------------- Form --------------------------------- */

export function Field({ label, htmlFor, hint, error, required, children, className = "" }) {
  return (
    <div className={cx("field", error && "field--error", className)}>
      {label ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="field__req">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field__error">
          <AlertCircle size={13} /> {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...rest }) {
  return <input className={cx("input", className)} {...rest} />;
}

export function Textarea({ className = "", rows = 4, ...rest }) {
  return <textarea className={cx("textarea", className)} rows={rows} {...rest} />;
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select className={cx("select", className)} {...rest}>
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, disabled = false, label, hint, className = "" }) {
  return (
    <label className={cx("switch", checked && "is-on", disabled && "is-disabled", className)}>
      <input
        type="checkbox"
        role="switch"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      {label || hint ? (
        <span className="switch__copy">
          {label ? <span className="switch__label">{label}</span> : null}
          {hint ? <span className="switch__hint">{hint}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export function Segmented({ options, value, onChange, className = "", size = "md" }) {
  return (
    <div className={cx("segmented", `segmented--${size}`, className)} role="tablist">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx("segmented__btn", active && "is-active")}
            onClick={() => onChange?.(option.value)}
          >
            {Icon ? <Icon size={16} aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({ items, value, onChange, className = "" }) {
  return (
    <div className={cx("tabs", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={cx("tabs__btn", value === item.id && "is-active")}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count > 0 ? <span className="tabs__count">{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Avatar -------------------------------- */

export function Avatar({ name = "", path = "", size = 40, className = "", ring = false }) {
  const url = mediaUrl(path);
  return (
    <span
      className={cx("avatar", ring && "avatar--ring", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.36),
        ...(url ? {} : { background: avatarTone(name) }),
      }}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" loading="lazy" width={size} height={size} /> : initials(name)}
    </span>
  );
}

/* -------------------------------- Feedback ------------------------------- */

export function Skeleton({ width, height = 16, radius = 8, className = "", style }) {
  return (
    <span
      className={cx("skeleton", className)}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function Spinner({ size = 22, className = "" }) {
  return <Loader2 size={size} className={cx("spin", className)} aria-label="Loading" />;
}

export function PageLoader({ label = "Loading EasyHome…" }) {
  return (
    <div className="page-loader">
      <div className="page-loader__mark">E</div>
      <Spinner size={26} />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, body, action, className = "" }) {
  return (
    <div className={cx("empty", className)}>
      <span className="empty__icon">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function InlineError({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="inline-error" role="alert">
      <AlertCircle size={18} />
      <div>
        <strong>Something needs attention</strong>
        <p>{error.message || String(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/* --------------------------------- Modal --------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  className = "",
}) {
  useLockBody(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={cx("modal", `modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
      >
        {title ? (
          <header className="modal__head">
            <div>
              <h2>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} />
          </header>
        ) : null}
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------- Stats --------------------------------- */

export function Stat({ label, value, hint, icon: Icon, tone = "plain", className = "" }) {
  return (
    <div className={cx("stat", `stat--${tone}`, className)}>
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        {Icon ? (
          <span className="stat__icon">
            <Icon size={18} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <strong className="stat__value">{value}</strong>
      {hint ? <span className="stat__hint">{hint}</span> : null}
    </div>
  );
}

export function ListRow({ icon: Icon, title, subtitle, trailing, onClick, className = "" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={cx("list-row", onClick && "list-row--button", className)}
      onClick={onClick}
    >
      {Icon ? (
        <span className="list-row__icon">
          <Icon size={18} aria-hidden="true" />
        </span>
      ) : null}
      <span className="list-row__copy">
        <span className="list-row__title">{title}</span>
        {subtitle ? <span className="list-row__sub">{subtitle}</span> : null}
      </span>
      {trailing ?? (onClick ? <ChevronRight size={18} className="list-row__chev" /> : null)}
    </Tag>
  );
}

/* ------------------------------ ErrorBoundary ---------------------------- */

import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("EasyHome UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <div className="crash__card">
            <span className="crash__mark">!</span>
            <h1>Something went wrong</h1>
            <p>Reload the app to continue. Your data is safe.</p>
            <Button onClick={() => window.location.reload()}>Reload EasyHome</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
