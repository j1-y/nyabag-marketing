type DataTableProps = {
  headers: string[];
  children: React.ReactNode;
  empty?: string;
  hasRows?: boolean;
};

export function DataTable({ headers, children, empty = "Nothing here yet.", hasRows = true }: DataTableProps) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{hasRows ? children : null}</tbody>
      </table>
      {!hasRows ? <div className="admin-empty">{empty}</div> : null}
    </div>
  );
}
