"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Save, Search, TrendingUp, Calculator, Loader2, CheckCircle2, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

interface DevoirEntryGridProps {
  students: any[];
  onSave: (data: any) => void;
  loading?: boolean;
}

export default function DevoirEntryGrid({ 
  students: initialStudents, 
  onSave,
  loading = false
}: DevoirEntryGridProps) {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setData(initialStudents.map(s => {
      const res = s.existingResult;
      const devArray = Array.isArray(s.devoirs) ? s.devoirs : [];
      
      const d1 = res?.devoir1 ?? devArray[0];
      const d2 = res?.devoir2 ?? devArray[1];
      const d3 = res?.devoir3 ?? devArray[2];
      const d4 = res?.devoir4 ?? devArray[3];
      const d5 = res?.devoir5 ?? devArray[4];
      const moy = res?.moyenneDevoirs ?? s.moyenneDevoirs ?? 0;

      return {
        studentId: s.id,
        matricule: s.numAdmission || "N/A",
        name: s.nomEtudiant || "Sans Nom",
        devoirs: [
          d1 != null && d1 !== "" ? String(d1) : "",
          d2 != null && d2 !== "" ? String(d2) : "",
          d3 != null && d3 !== "" ? String(d3) : "",
          d4 != null && d4 !== "" ? String(d4) : "",
          d5 != null && d5 !== "" ? String(d5) : "",
        ],
        moyenneDevoirs: Number(moy) || 0,
      };
    }));
  }, [initialStudents]);

  const processedData = useMemo(() => {
    return data.map(row => {
      const vals = row.devoirs
        .map((v: string) => parseFloat(v))
        .filter((v: number) => !isNaN(v));
      
      const avg = vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      return { ...row, moyenneDevoirs: avg };
    });
  }, [data]);

  const handleDevoirInput = (id: number, index: number, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    const num = parseFloat(value);
    if (num > 20) return;

    setData(prev => prev.map(row => {
      if (row.studentId === id) {
        const newDevoirs = [...row.devoirs];
        newDevoirs[index] = value;
        return { ...row, devoirs: newDevoirs };
      }
      return row;
    }));
  };

  const filteredData = processedData.filter(r => {
    const name = r.name || "";
    const matricule = r.matricule || "";
    const searchTerm = search.toLowerCase();
    return name.toLowerCase().includes(searchTerm) || 
           matricule.toLowerCase().includes(searchTerm);
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={18} />
          </div>
          <Input 
            placeholder="Rechercher un élève..." 
            value={search}
            disabled={loading}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 bg-white rounded-2xl border-slate-100 shadow-sm focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium disabled:opacity-60"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 font-bold text-xs animate-pulse">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <span>Enregistrement et ترحيل البيانات en cours... Veuillez patienter.</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="bg-slate-900 text-white px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-4 border border-slate-800">
              <Loader2 size={28} className="animate-spin text-emerald-400" />
              <div>
                <p className="font-black text-sm">Enregistrement et ترحيل البيانات en cours...</p>
                <p className="text-xs text-slate-400 font-medium">Les moyennes DS sont en cours de mise à jour dans les bulletins.</p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <TableHead>MATRICULE</TableHead>
                <TableHead className="w-[300px]">PRENOM ET NOM</TableHead>
                <TableHead className="text-center">DEVOIR 1ER</TableHead>
                <TableHead className="text-center">DEVOIR 2EME</TableHead>
                <TableHead className="text-center">DEVOIR 3EME</TableHead>
                <TableHead className="text-center">DEVOIR 4EME</TableHead>
                <TableHead className="text-center">DEVOIR 5EME</TableHead>
                <TableHead className="text-center bg-amber-500/10 text-amber-600">MOYENNE DS</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((row) => (
                <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg">
                      {row.matricule}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700">{row.name}</p>
                  </td>
                  {row.devoirs.map((val: string, i: number) => (
                    <td key={i} className="px-4 py-4 text-center">
                      <Input 
                        value={val}
                        disabled={loading}
                        onChange={(e) => handleDevoirInput(row.studentId, i, e.target.value)}
                        placeholder="--"
                        className="w-20 h-10 text-center rounded-xl bg-slate-50 border-slate-200 font-bold focus:bg-white focus:ring-indigo-500/10 mx-auto disabled:opacity-50"
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center bg-amber-50/30">
                    <span className="text-lg font-black text-amber-600">
                      {row.moyenneDevoirs.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-900 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-amber-500/20 rounded-2xl">
              <Calculator className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calcul &amp; ترحيل Automatique</p>
              <p className="text-sm font-medium text-slate-400">La moyenne DS est calculée et transférée automatiquement dans les bulletins.</p>
            </div>
          </div>
          <Button 
            onClick={() => onSave(processedData)}
            disabled={loading}
            className="h-14 px-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                <span>Enregistrement &amp; ترحيل en cours...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Enregistrer les Devoirs &amp; Transférer</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TableHead({ children, className }: any) {
  return (
    <th className={`px-6 py-6 text-[11px] font-black uppercase tracking-widest ${className}`}>
      {children}
    </th>
  );
}
