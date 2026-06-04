import { DataTable } from "@/components/admin/DataTable";

type StorageFile = {
  bucket: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  previewUrl?: string | null;
};

export function StorageTable({ files }: { files: StorageFile[] }) {
  return (
    <DataTable
      headers={["Bucket", "Path", "Type", "Size", "Created", "Preview"]}
      hasRows={files.length > 0}
      empty="No files found in the selected bucket."
    >
      {files.map((file) => (
        <tr key={`${file.bucket}:${file.path}`}>
          <td>{file.bucket}</td>
          <td>{file.path}</td>
          <td>{file.mimeType || "-"}</td>
          <td>{formatBytes(file.size)}</td>
          <td>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "-"}</td>
          <td>{file.previewUrl ? <a className="btn-ghost btn-sm" href={file.previewUrl} target="_blank">Open</a> : "-"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
