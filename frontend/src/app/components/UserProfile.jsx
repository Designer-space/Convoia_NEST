import Avatar from "./Avatar";

/**
 * One person, one row: avatar, name, handle, and the actions that make sense
 * for the list it appears in. Rows are separated by hairlines from the parent,
 * so a list reads as one object rather than a stack of cards.
 */
export function UserProfile({ name, username, avatar, meta, actions }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={avatar} size={44} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {username ? (
            <p className="truncate text-[13px] text-t-muted">@{username}</p>
          ) : null}
          {meta ? <p className="truncate text-[13px] text-t-muted">{meta}</p> : null}
        </div>
      </div>

      {actions?.length ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={actionClass(action.variant, action.disabled)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function actionClass(variant, disabled) {
  const base =
    "inline-flex min-h-10 items-center justify-center rounded-lg px-3.5 text-[13px] font-medium transition-colors sm:min-h-9";
  if (disabled) {
    return `${base} cursor-not-allowed border border-t-border text-t-muted opacity-60`;
  }

  switch (variant) {
    case "danger":
      return `${base} cursor-pointer border border-t-border-strong text-t-danger hover:bg-t-danger-surface`;
    case "quiet":
      return `${base} cursor-pointer border border-t-border-strong text-foreground hover:bg-t-hover`;
    default:
      return `${base} cursor-pointer bg-t-primary text-t-on-primary hover:opacity-90`;
  }
}
