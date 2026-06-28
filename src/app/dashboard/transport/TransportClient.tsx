"use client";

import React, { useState, useTransition, useEffect } from "react";
import { 
  Bus, MapPin, Users, TrendingUp, Phone, Calendar, 
  Search, Filter, Loader2, X, Plus, Trash2, 
  User, CheckCircle2, DollarSign, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addSubscription, removeSubscription, saveTransportRoute, searchStudentsAction } from "@/domains/transport/actions/transport.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Route {
  id: number;
  routeName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  monthlyFee: number;
}

interface Subscription {
  id: number;
  studentId: number;
  routeId: number;
  pickupPoint?: string;
  startDate: string;
  status: string;
  student?: {
    id: number;
    nomEtudiant: string;
    classe?: string;
    numAdmission: string;
  };
  route?: Route;
}

interface TransportClientProps {
  initialRoutes: Route[];
  initialSubscriptions: Subscription[];
}

export default function TransportClient({ initialRoutes, initialSubscriptions }: TransportClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState("subs");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Subscription Form State
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Route Form State
  const [routeName, setRouteName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");

  // Debounced student search
  useEffect(() => {
    if (!studentSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const res = await searchStudentsAction(studentSearch);
        if (res.data) {
          setSearchResults(res.data);
        }
      } catch {
        toast.error("Erreur lors de la recherche des élèves");
      }
      setIsSearchingStudents(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Filter subscriptions and routes
  const filteredSubs = initialSubscriptions.filter(s => 
    s.student?.nomEtudiant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student?.classe?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.route?.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.pickupPoint?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoutes = initialRoutes.filter(r => 
    r.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = initialSubscriptions.reduce((acc, s) => acc + (s.route?.monthlyFee || 0), 0);

  const stats = [
    { label: "Lignes Actives", value: initialRoutes.length, icon: Bus, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Élèves Abonnés", value: initialSubscriptions.length, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Revenu Mensuel", value: totalRevenue.toLocaleString() + " CFA", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const handleCreateSubscription = () => {
    if (!selectedStudent) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }
    if (!selectedRouteId) {
      toast.error("Veuillez sélectionner un trajet / bus");
      return;
    }

    startTransition(async () => {
      const res = await addSubscription({
        studentId: selectedStudent.id,
        routeId: parseInt(selectedRouteId),
        pickupPoint: pickupPoint || undefined,
        startDate: new Date(startDate)
      });

      if (res.success) {
        toast.success("Élève inscrit au transport scolaire avec succès !");
        setIsSubModalOpen(false);
        // Reset states
        setSelectedStudent(null);
        setStudentSearch("");
        setSelectedRouteId("");
        setPickupPoint("");
        router.refresh();
      } else {
        toast.error("Erreur lors de l'inscription.");
      }
    });
  };

  const handleCreateRoute = () => {
    if (!routeName.trim() || !vehicleNumber.trim() || !driverName.trim() || !monthlyFee) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    startTransition(async () => {
      const res = await saveTransportRoute({
        routeName,
        vehicleNumber,
        driverName,
        driverPhone: driverPhone || undefined,
        monthlyFee: parseFloat(monthlyFee)
      });

      if (res.success) {
        toast.success("Nouvelle ligne de transport créée avec succès !");
        setIsRouteModalOpen(false);
        // Reset states
        setRouteName("");
        setVehicleNumber("");
        setDriverName("");
        setDriverPhone("");
        setMonthlyFee("");
        router.refresh();
      } else {
        toast.error("Erreur lors de la création.");
      }
    });
  };

  const handleDeleteSubscription = (id: number) => {
    if (!confirm("Voulez-vous vraiment désabonner cet élève de cette ligne ?")) return;

    startTransition(async () => {
      const res = await removeSubscription(id);
      if (res.success) {
        toast.success("Désabonnement effectué.");
        router.refresh();
      } else {
        toast.error("Erreur lors du désabonnement.");
      }
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Transport Scolaire</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestion intelligente des bus, des chauffeurs et des abonnements</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={cn("p-4 rounded-2xl", stat.bg, stat.color)}>
              <stat.icon size={26} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Layout */}
      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
        
        {/* Navigation & Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl h-14 w-full max-w-sm gap-2">
            <TabsTrigger value="subs" className="rounded-xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm flex-1">
              👨‍🎓 Abonnés
            </TabsTrigger>
            <TabsTrigger value="routes" className="rounded-xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm flex-1">
              🚌 Lignes & Bus
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={tab === "subs" ? "Rechercher un abonné..." : "Rechercher une ligne..."} 
                className="pl-11 rounded-xl border-slate-100 bg-slate-50/50 shadow-none h-12 text-xs font-bold" 
              />
            </div>
            {tab === "subs" ? (
              <Button 
                onClick={() => setIsSubModalOpen(true)}
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus size={16} /> Inscrire un Élève
              </Button>
            ) : (
              <Button 
                onClick={() => setIsRouteModalOpen(true)}
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus size={16} /> Nouvelle Ligne
              </Button>
            )}
          </div>
        </div>

        {/* Tab 1: Subscriptions list */}
        <TabsContent value="subs" className="outline-none">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ligne / Zone</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ramassage</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Début</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarif / Mois</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSubs.map((s) => (
                    <tr key={s.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 font-bold border border-slate-100 text-xs">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{s.student?.nomEtudiant}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.student?.classe || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="font-bold text-indigo-600 text-xs">{s.route?.routeName}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                          <MapPin size={13} className="text-slate-400" /> {s.pickupPoint || "Standard"}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-xs font-semibold text-slate-600">
                        {s.startDate ? new Date(s.startDate).toLocaleDateString("fr-FR") : "N/A"}
                      </td>
                      <td className="px-6 py-4.5 font-black text-xs text-slate-800">
                        {s.route?.monthlyFee?.toLocaleString()} CFA
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={cn(
                          "px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                          s.status === 'Actif' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        )}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <button 
                          onClick={() => handleDeleteSubscription(s.id)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSubs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                        Aucun abonné inscrit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Routes & Buses List */}
        <TabsContent value="routes" className="outline-none">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Zone / Trajet</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Bus / Plaque</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Chauffeur</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tarif Mensuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRoutes.map((r) => (
                    <tr key={r.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4.5 font-bold text-slate-900 text-xs">{r.routeName}</td>
                      <td className="px-6 py-4.5 font-extrabold text-indigo-600 text-xs">{r.vehicleNumber}</td>
                      <td className="px-6 py-4.5 font-semibold text-slate-700 text-xs">{r.driverName}</td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                          <Phone size={13} className="text-slate-400" /> {r.driverPhone || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-right font-black text-xs text-slate-800">
                        {r.monthlyFee?.toLocaleString()} CFA
                      </td>
                    </tr>
                  ))}
                  {filteredRoutes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                        Aucune ligne de transport disponible.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: SUBSCRIBE STUDENT ─── */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Inscription au Transport Scolaire</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Associer un élève à un trajet de bus</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSubModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* 1. Student Search Input & Autocomplete */}
              <div className="space-y-2 relative">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rechercher l'élève</Label>
                
                {selectedStudent ? (
                  <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {selectedStudent.nomEtudiant.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{selectedStudent.nomEtudiant}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5">{selectedStudent.classe || "N/A"} • Ref: {selectedStudent.numAdmission}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedStudent(null); setStudentSearch(""); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <Input 
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Saisir le nom de l'élève..." 
                        className="pl-11 h-12 rounded-xl border-slate-200 focus:border-indigo-500 text-xs font-bold text-slate-800"
                      />
                      {isSearchingStudents && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={16} />
                      )}
                    </div>

                    {/* Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-50 max-h-48 overflow-y-auto">
                        {searchResults.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => { setSelectedStudent(s); setSearchResults([]); }}
                            className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs font-bold text-slate-700"
                          >
                            <div>
                              <p className="font-extrabold text-slate-900">{s.nomEtudiant}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{s.classe || "N/A"} • Ref: {s.numAdmission}</p>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Choisir</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 2. Route Selection Dropdown */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ligne & Trajet de Bus</Label>
                <Select onValueChange={setSelectedRouteId} value={selectedRouteId}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Sélectionner une ligne active..." />
                  </SelectTrigger>
                  <SelectContent>
                    {initialRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()} className="text-xs font-bold">
                        {r.routeName} - {r.vehicleNumber} ({r.monthlyFee.toLocaleString()} CFA)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Pickup Point & Start Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Point de Ramassage</Label>
                  <Input 
                    value={pickupPoint}
                    onChange={e => setPickupPoint(e.target.value)}
                    placeholder="Ex: Station Essence"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date d'effet</Label>
                  <Input 
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsSubModalOpen(false)}
                className="h-11 px-5 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-100"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateSubscription}
                disabled={isPending}
                className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                {isPending && <Loader2 className="animate-spin" size={14} />}
                Inscrire l'Élève
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADD NEW ROUTE ─── */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bus size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Nouvelle Ligne de Transport</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Créer un trajet et affecter un chauffeur</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRouteModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Zone / Nom du Trajet *</Label>
                <Input 
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  placeholder="Ex: Kalley - Plateau"
                  className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plaque / Numéro Bus *</Label>
                  <Input 
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value)}
                    placeholder="Ex: RN 4390 A"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tarif Mensuel (CFA) *</Label>
                  <Input 
                    type="number"
                    value={monthlyFee}
                    onChange={e => setMonthlyFee(e.target.value)}
                    placeholder="Ex: 15000"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nom du Chauffeur *</Label>
                  <Input 
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="Ex: Ibrahim Ali"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Téléphone Chauffeur</Label>
                  <Input 
                    value={driverPhone}
                    onChange={e => setDriverPhone(e.target.value)}
                    placeholder="Ex: +227 90 12 34 56"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsRouteModalOpen(false)}
                className="h-11 px-5 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-100"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleCreateRoute}
                disabled={isPending}
                className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                {isPending && <Loader2 className="animate-spin" size={14} />}
                Créer la Ligne
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
