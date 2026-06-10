"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Save, Search, TrendingUp, Calculator
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
  loading
}: DevoirEntryGridProps) {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setData(initialStudents.map(s => {
      const res = s.existingResult;
      return {
        studentId: s.id,
        matricule: s.numAdmission || "N/A",
        name: s.nomEtudiant || "Sans Nom",
        devoirs: [
          res?.devoir1?.toString() || "",
          res?.devoir2?.toString() || "",
          res?.devoir3?.toString() || "",
          res?.devoir4?.toString() || "",
          res?.devoir5?.toString() || "",
        ],
        moyenneDevoirs: res?.moyenneDevoirs || 0,
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={18} />
          </div>
          <Input 
            placeholder="Rechercher un élève..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 bg-white rounded-2xl border-slate-100 shadow-sm focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
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
                        onChange={(e) => handleDevoirInput(row.studentId, i, e.target.value)}
                        placeholder="--"
                        className="w-20 h-10 text-center rounded-xl bg-slate-50 border-slate-200 font-bold focus:bg-white focus:ring-indigo-500/10 mx-auto"
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

        <div className="bg-slate-900 p-8 flex justify-between items-center">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-amber-500/20 rounded-2xl">
              <Calculator className="text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Calcul Automatique</p>
              <p className="text-sm font-medium text-slate-400">La moyenne DS est mise à jour en temps réel.</p>
            </div>
          </div>
          <Button 
            onClick={() => onSave(processedData)}
            disabled={loading}
            className="h-14 px-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-3"
          >
            <Save size={20} /> Enregistrer les Devoirs
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
