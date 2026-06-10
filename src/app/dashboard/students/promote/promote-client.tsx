"use client";

import * as React from "react";
import { 
  ArrowRight, 
  Search, 
  Filter, 
  Clock, 
  Info, 
  CheckCircle2, 
  Users, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Download, 
  ChevronDown, 
  MoreVertical,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { promoteStudents } from "@/domains/students/actions/promotion.actions";

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
  moyenne?: number;
  statut?: string;
  classe: string;
  session: string;
}

interface PromoteClientProps {
  students: Student[];
  classes: any[];
  sessions: any[];
  initialClass?: string;
  initialSession?: string;
}

export default function PromoteClient({ 
  students: allStudents, 
  classes, 
  sessions,
  initialClass,
  initialSession
}: PromoteClientProps) {
  const router = useRouter();
  const [sourceClass, setSourceClass] = React.useState(initialClass || "");
  const [sourceSession, setSourceSession] = React.useState(initialSession || "");
  const [targetClass, setTargetClass] = React.useState("");
  const [targetSession, setTargetSession] = React.useState("");
  const [transferBalance, setTransferBalance] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [isPromoting, setIsPromoting] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Filtering logic
  const filteredStudents = React.useMemo(() => {
    return allStudents.filter(s => {
      const matchesSearch = s.nomEtudiant.toLowerCase().includes(search.toLowerCase()) || 
                           s.numAdmission.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !sourceClass || s.classe === sourceClass;
      const matchesSession = !sourceSession || s.session === sourceSession;
      return matchesSearch && matchesClass && matchesSession;
    });
  }, [allStudents, search, sourceClass, sourceSession]);

  const stats = React.useMemo(() => {
    const total = filteredStudents.length;
    // Mocking eligibility for demo based on moyenne if exists, else random
    const eligibles = filteredStudents.filter(s => (s.moyenne || 12) >= 10).length;
    const atRisk = filteredStudents.filter(s => (s.moyenne || 12) < 10 && (s.moyenne || 12) >= 8).length;
    const nonEligibles = total - eligibles - atRisk;

    return { total, eligibles, atRisk, nonEligibles };
  }, [filteredStudents]);

  const chartData = [
    { name: "Éligibles", value: stats.total > 0 ? (stats.eligibles / stats.total) * 100 : 0, color: "#10b981" },
    { name: "En risque", value: stats.total > 0 ? (stats.atRisk / stats.total) * 100 : 0, color: "#f59e0b" },
    { name: "Non éligibles", value: stats.total > 0 ? (stats.nonEligibles / stats.total) * 100 : 0, color: "#ef4444" },
  ];

  const handlePromote = async () => {
    if (selectedIds.length === 0) {
      toast.error("Veuillez sélectionner au moins un étudiant.");
      return;
    }
    if (!targetClass || !targetSession) {
      toast.error("Veuillez sélectionner la classe et la session de destination.");
      return;
    }

    setIsPromoting(true);
    try {
      const res = await promoteStudents({
        studentIds: selectedIds,
        targetClass,
        targetSession,
        transferBalance
      }) as any;

      if (res.success || res.data?.success) {
        toast.success(res.message || res.data?.message || "Promotion réussie !");
        setSelectedIds([]);
        router.refresh();
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (error) {
      toast.error("Erreur de connexion.");
    } finally {
      setIsPromoting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#fdfdff] min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Promotion des Élèves</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Transférez les élèves vers la classe supérieure pour la nouvelle année</p>
          </div>
        </div>
        <Button variant="ghost" className="text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors">
          <Clock size={18} />
          Historique des promotions
        </Button>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source Class */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <ArrowRight size={20} className="rotate-180" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Classe Actuelle (Source)</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium -mt-4">Sélectionnez la classe actuelle des élèves</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</label>
              <div className="relative">
                <select 
                  value={sourceClass}
                  onChange={(e) => setSourceClass(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {classes.map(c => <option key={c.id} value={c.className}>{c.className}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session</label>
              <div className="relative">
                <select 
                  value={sourceSession}
                  onChange={(e) => setSourceSession(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {sessions.map(s => <option key={s.id} value={s.sessionName}>{s.sessionName}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl text-indigo-600">
            <Info size={18} />
            <span className="text-xs font-bold">Effectif total : {stats.total} élèves</span>
          </div>
        </div>

        {/* Target Class */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <ArrowRight size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Classe Suivante (Destination)</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium -mt-4">Sélectionnez la classe de destination</p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</label>
              <div className="relative">
                <select 
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {classes.map(c => <option key={c.id} value={c.className}>{c.className}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session</label>
              <div className="relative">
                <select 
                  value={targetSession}
                  onChange={(e) => setTargetSession(e.target.value)}
                  className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-slate-700 appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Sélectionner</option>
                  {sessions.map(s => <option key={s.id} value={s.sessionName}>{s.sessionName}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl text-emerald-600">
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold">Les élèves retenus seront transférés vers la classe sélectionnée.</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-10 divide-x divide-slate-100 overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Élèves dans la classe</p>
              <p className="text-xl font-black text-slate-900">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Éligibles à la promotion</p>
              <p className="text-xl font-black text-slate-900">{stats.eligibles} <span className="text-sm font-bold text-slate-400">({stats.total > 0 ? ((stats.eligibles / stats.total) * 100).toFixed(1) : 0}%)</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">En risque</p>
              <p className="text-xl font-black text-slate-900">{stats.atRisk} <span className="text-sm font-bold text-slate-400">({stats.total > 0 ? ((stats.atRisk / stats.total) * 100).toFixed(1) : 0}%)</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
              <XCircle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Non éligibles</p>
              <p className="text-xl font-black text-slate-900">{stats.nonEligibles} <span className="text-sm font-bold text-slate-400">({stats.total > 0 ? ((stats.nonEligibles / stats.total) * 100).toFixed(1) : 0}%)</span></p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <div className="w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={20}
                  outerRadius={30}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {chartData.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[10px] font-bold text-slate-500">{entry.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900">{entry.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Table Header/Toolbar */}
        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Liste des élèves à promouvoir</h3>
              <p className="text-slate-500 font-medium text-xs mt-1">Sélectionnez les élèves et lancez le processus de promotion.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève..." 
                  className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <Button variant="outline" className="h-11 px-5 rounded-xl border-slate-100 text-slate-600 font-bold flex items-center gap-2">
                <Filter size={16} /> Filtres
              </Button>
              <Button className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                <Eye size={16} /> Aperçu de la promotion
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-grow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-y border-slate-100">
                <th className="px-8 py-4 text-left">
                  <Checkbox 
                    checked={selectedIds.length > 0 && selectedIds.length === filteredStudents.length}
                    onCheckedChange={toggleAll}
                    className="rounded-md border-slate-200" 
                  />
                </th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Élève</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Moy. Générale</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Décision</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Commentaire</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Statut</th>
                <th className="px-8 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const moyenne = student.moyenne || 12;
                  const status = moyenne >= 10 ? "Éligible" : moyenne >= 8 ? "En risque" : "Non éligible";
                  const decision = moyenne >= 10 ? "Promu" : "En risque";

                  return (
                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <Checkbox 
                          checked={selectedIds.includes(student.id)} 
                          onCheckedChange={() => toggleSelect(student.id)}
                          className="rounded-md border-slate-200" 
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-slate-100">
                            <Users size={20} className="text-indigo-300" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-none">{student.nomEtudiant}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{student.numAdmission}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className={cn(
                          "text-sm font-black",
                          moyenne >= 10 ? "text-indigo-600" : "text-rose-500"
                        )}>
                          {moyenne.toFixed(2)} <span className="text-[10px] text-slate-400">/ 20</span>
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative w-32">
                          <select 
                            defaultValue={decision}
                            className={cn(
                              "w-full h-9 px-3 rounded-lg border border-slate-100 text-[11px] font-bold outline-none appearance-none cursor-pointer",
                              decision === "Promu" ? "text-emerald-600" : decision === "En risque" ? "text-amber-600" : "text-rose-500"
                            )}
                          >
                            <option value="Promu">Promu</option>
                            <option value="En risque">En risque</option>
                            <option value="Non promu">Non promu</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={12} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          placeholder="Ajouter un commentaire..."
                          className="w-full h-10 px-4 bg-slate-50 border border-transparent rounded-xl text-[11px] font-medium text-slate-600 outline-none focus:border-slate-200 focus:bg-white transition-all"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            status === "Éligible" ? "bg-emerald-500" : status === "En risque" ? "bg-amber-500" : "bg-rose-500"
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            status === "Éligible" ? "text-emerald-600" : status === "En risque" ? "text-amber-600" : "text-rose-600"
                          )}>
                            {status}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Users size={64} />
                      <p className="text-xl font-bold">Aucun étudiant trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedIds.length} sélectionnés</span>
            </div>
            <button 
              onClick={() => setSelectedIds([])}
              className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
            >
              Tout désélectionner
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-xl border-indigo-100 text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-50">
              <Download size={18} /> Exporter la liste
            </Button>
            <Button 
              disabled={isPromoting || selectedIds.length === 0}
              onClick={handlePromote}
              className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
            >
              {isPromoting ? "Traitement..." : <><ArrowUpRight size={18} /> Lancer la promotion</>}
            </Button>
          </div>
        </div>
      </div>
      
    </div>
  );
}
