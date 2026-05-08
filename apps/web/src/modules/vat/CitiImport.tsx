import { useRef, useState } from "react";
import { api } from "../../lib/api.js";

interface ParseError { line: number; message: string }
interface Preview { rows: unknown[]; errors: ParseError[] }

export default function CitiImport({ mode, onImported }: { mode: "sales" | "purchases"; onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [committing, setCommitting] = useState(false);
  const [done, setDone] = useState<{ inserted: number; rejected: number } | null>(null);

  const handleFile = async (file: File) => {
    setPreview(null); setDone(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await api.post<Preview>(`/citi/${mode}/preview`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    setPreview(r.data);
  };

  const handleCommit = async () => {
    if (!inputRef.current?.files?.[0]) return;
    setCommitting(true);
    const fd = new FormData();
    fd.append("file", inputRef.current.files[0]);
    const r = await api.post<{ inserted: number; rejected: number; errors: ParseError[] }>(
      `/citi/${mode}/commit`, fd, { headers: { "Content-Type": "multipart/form-data" } }
    );
    setDone({ inserted: r.data.inserted, rejected: r.data.rejected });
    setCommitting(false);
    onImported();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        CSV con cabeceras: <code className="bg-slate-100 px-1 rounded text-xs">period, issueDate, invoiceType, pointOfSale, number, cuit, name, netAmount, vat21, vat105, vat27, total</code>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/plain"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="block w-full text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
      />

      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Vista previa: <span className="text-green-600">{preview.rows.length} filas válidas</span>
            {preview.errors.length > 0 && <span className="text-red-500 ml-2">{preview.errors.length} con errores</span>}
          </p>
          {preview.errors.map((e) => (
            <div key={e.line} className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1 text-red-600">
              Línea {e.line}: {e.message}
            </div>
          ))}
          {preview.rows.length > 0 && (
            <button
              onClick={handleCommit}
              disabled={committing}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg disabled:opacity-60"
            >
              {committing ? "Importando..." : `Importar ${preview.rows.length} filas`}
            </button>
          )}
        </div>
      )}

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
          Importadas {done.inserted} facturas.
          {done.rejected > 0 && ` ${done.rejected} rechazadas (duplicados o errores).`}
        </div>
      )}
    </div>
  );
}
