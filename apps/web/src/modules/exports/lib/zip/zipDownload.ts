import JSZip from "jszip";

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface ZipEntry {
  filename: string;
  blob: Blob;
}

export async function downloadAll(entries: ZipEntry[], zipName: string) {
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.filename, await e.blob.arrayBuffer());
  }
  const out = await zip.generateAsync({ type: "uint8array" });
  triggerDownload(new Blob([out as BlobPart], { type: "application/zip" }), zipName);
}
