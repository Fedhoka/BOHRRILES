/**
 * Descarga múltiples archivos comprimidos como ZIP usando la Compression Streams API
 * (disponible en Chrome 80+, Firefox 113+). Para navegadores sin soporte
 * se descargan los archivos individualmente.
 */
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

/**
 * Descarga todas las entradas individualmente (fallback sin dependencia de JSZip).
 * En producción se puede integrar fflate/JSZip si se desea un ZIP real.
 */
export async function downloadAll(entries: ZipEntry[], zipName: string) {
  // Intentar crear ZIP nativo usando fflate si está disponible, sino descarga individual
  try {
    const { default: JSZip } = await import("jszip" as string) as { default: { new(): {
      file(name: string, data: ArrayBuffer): void;
      generateAsync(opts: { type: string }): Promise<Uint8Array>;
    }; }};
    const zip = new JSZip();
    for (const e of entries) {
      zip.file(e.filename, await e.blob.arrayBuffer());
    }
    const out = await zip.generateAsync({ type: "uint8array" });
    triggerDownload(new Blob([out], { type: "application/zip" }), zipName);
  } catch {
    // Fallback: descarga individual con delay
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      await new Promise<void>((res) => setTimeout(res, i * 400));
      triggerDownload(e.blob, e.filename);
    }
  }
}
