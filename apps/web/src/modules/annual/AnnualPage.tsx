import { useState } from "react";
import { useAnnualData } from "./hooks/useAnnualData.js";
import VatPositionChart from "./VatPositionChart.js";
import ForecastPanel from "./ForecastPanel.js";
import LaborCostTable from "./LaborCostTable.js";
import TaxCalendar from "./TaxCalendar.js";

export default function AnnualPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { vatHistory, payrollRuns, employees, loading } = useAnnualData(year);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard Anual</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="px-2 py-1 border rounded text-sm text-slate-500 hover:bg-slate-50">‹</button>
          <span className="text-base font-semibold text-slate-700 w-14 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="px-2 py-1 border rounded text-sm text-slate-500 hover:bg-slate-50">›</button>
        </div>
      </div>

      {loading && <p className="text-slate-400 text-sm">Cargando datos del año...</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <VatPositionChart vatHistory={vatHistory} year={year} />
        <ForecastPanel vatHistory={vatHistory} year={year} />
      </div>

      <LaborCostTable payrollRuns={payrollRuns} employees={employees} />
      <TaxCalendar year={year} />
    </div>
  );
}
