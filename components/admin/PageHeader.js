// Sticky header for admin pages (same bar as the editors): breadcrumb + title on the left, actions on the right.
export default function PageHeader({ eyebrow, title, badge, children }) {
  return (
    <header className="adm-editbar">
      <div className="adm-page-title">
        {eyebrow && <span className="adm-eyebrow">{eyebrow}</span>}
        <div className="adm-title-row"><h1 className="admin-title">{title}</h1>{badge}</div>
      </div>
      {children && <div className="adm-editbar-actions">{children}</div>}
    </header>
  );
}
