type AdminHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function AdminHeader({ title, description, action }: AdminHeaderProps) {
  return (
    <header className="admin-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
