"use client";

import React, { useState, useTransition, useMemo } from "react";
import { 
  Building, Bed, Users, ShieldCheck, DoorOpen, Plus, Search, MapPin, 
  Trash2, X, Check, DollarSign, RefreshCw, UserCheck, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  saveHostelRoom, 
  allocateRoom, 
  vacateRoom, 
  deleteHostelRoom, 
  deleteHostelAllocation 
} from "@/domains/hostel/actions/hostel.actions";

interface Props {
  rooms: any[];
  allocations: any[];
  students: any[];
}

export default function HostelClient({ rooms: initialRooms, allocations: initialAllocations, students }: Props) {
  const [activeTab, setActiveTab] = useState<string>("residents");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Dynamically compute occupied beds count and cost fields for each room based on active allocations
  const rooms = useMemo(() => {
    return initialRooms.map((r) => {
      const activeCount = initialAllocations.filter((a) => a.roomId === r.id && a.status === "Occupé").length;
      return {
        ...r,
        occupiedBeds: activeCount,
        cost: r.costPerTerm ?? r.cost ?? 0
      };
    });
  }, [initialRooms, initialAllocations]);

  const allocations = initialAllocations;

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState<any | null>(null);

  // Form states - Add Room
  const [roomNumber, setRoomNumber] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [roomType, setRoomType] = useState("Garçons");
  const [studentSearch, setStudentSearch] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [cost, setCost] = useState("50000");

  // Form states - Allocate Student
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  // Statistics recalculation
  const totalCapacity = useMemo(() => rooms.reduce((acc, r) => acc + (r.capacity || 0), 0), [rooms]);
  const occupiedBeds = useMemo(() => rooms.reduce((acc, r) => acc + (r.occupiedBeds || 0), 0), [rooms]);
  const stats = [
    { label: "Total Chambres", value: rooms.length, icon: Building, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Capacité Totale", value: totalCapacity, icon: Bed, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Lits Disponibles", value: totalCapacity - occupiedBeds, icon: DoorOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  // Filtering residents
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      const studentName = (a.student?.nomEtudiant || "").toLowerCase();
      const studentMatricule = (a.student?.numAdmission || "").toLowerCase();
      const rNum = (a.room?.roomNumber || "").toLowerCase();
      const bName = (a.room?.buildingName || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      return studentName.includes(query) || 
             studentMatricule.includes(query) || 
             rNum.includes(query) || 
             bName.includes(query);
    });
  }, [allocations, searchQuery]);

  // Filtering rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const rNum = (r.roomNumber || "").toLowerCase();
      const bName = (r.buildingName || "").toLowerCase();
      const type = (r.roomType || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      return rNum.includes(query) || bName.includes(query) || type.includes(query);
    });
  }, [rooms, searchQuery]);

  // Get students eligible for housing (not already allocated in an occupied room)
  const availableStudents = useMemo(() => {
    const allocatedStudentIds = new Set(
      allocations
        .filter((a) => a.status === "Occupé" && a.studentId)
        .map((a) => a.studentId)
    );
    return students.filter((s) => !allocatedStudentIds.has(s.id));
  }, [students, allocations]);

  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearch) return availableStudents;
    const query = studentSearch.toLowerCase();
    return availableStudents.filter((s) => {
      const name = (s.nomEtudiant || "").toLowerCase();
      const matricule = (s.numAdmission || "").toLowerCase();
      const className = (s.classe || "").toLowerCase();
      return name.includes(query) || matricule.includes(query) || className.includes(query);
    });
  }, [availableStudents, studentSearch]);

  // Get rooms with available capacity
  const availableRooms = useMemo(() => {
    return rooms.filter((r) => (r.occupiedBeds || 0) < r.capacity);
  }, [rooms]);

  // Action: Add Room
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !buildingName || !capacity) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }

    startTransition(async () => {
      const res = await saveHostelRoom({
        roomNumber,
        buildingName,
        roomType,
        capacity: parseInt(capacity),
        costPerTerm: parseFloat(cost) || 0,
      });

      if (res.success) {
        toast.success("Chambre ajoutée avec succès !");
        setIsRoomModalOpen(false);
        // Reset form
        setRoomNumber("");
        setBuildingName("");
        setRoomType("Garçons");
        setCapacity("4");
        setCost("50000");
        // Reload state (since it's a server action, database was updated)
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur lors de la création de la chambre.");
      }
    });
  };

  // Action: Allocate Student
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoomId) {
      toast.error("Veuillez sélectionner un élève et une chambre.");
      return;
    }

    startTransition(async () => {
      const res = await allocateRoom(parseInt(selectedStudentId), parseInt(selectedRoomId));

      if (res.success) {
        toast.success("Élève logé avec succès !");
        setIsAllocateModalOpen(false);
        setSelectedStudentId("");
        setSelectedRoomId("");
        setStudentSearch("");
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur lors de l'affectation.");
      }
    });
  };

  // Action: Vacate Room (Liberer)
  const handleVacate = async (allocationId: number) => {
    if (!confirm("Voulez-vous libérer cette chambre ?")) return;

    startTransition(async () => {
      const res = await vacateRoom(allocationId);
      if (res.success) {
        toast.success("Chambre libérée avec succès !");
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur lors de la libération.");
      }
    });
  };

  // Action: Delete Allocation
  const handleDeleteAllocation = async (id: number) => {
    if (!confirm("Voulez-vous supprimer cette affectation ?")) return;

    startTransition(async () => {
      const res = await deleteHostelAllocation(id);
      if (res.success) {
        toast.success("Affectation supprimée avec succès !");
        window.location.reload();
      } else {
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  // Action: Delete Room
  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm("Voulez-vous supprimer cette chambre ? Tout historique d'affectation lié sera affecté.")) return;

    startTransition(async () => {
      const res = await deleteHostelRoom(roomId);
      if (res.success) {
        toast.success("Chambre supprimée avec succès !");
        window.location.reload();
      } else {
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  return (
    <div className="p-4 md:p-10 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Internat & Dortoirs</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestion des résidences étudiantes, des tarifs et des affectations de chambres</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={`p-5 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TABS & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="bg-slate-100 p-1.5 rounded-2xl w-fit flex gap-1">
          <button 
            onClick={() => { setActiveTab("residents"); setSearchQuery(""); }}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === "residents" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            👨‍🎓 Résidents
          </button>
          <button 
            onClick={() => { setActiveTab("rooms"); setSearchQuery(""); }}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === "rooms" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🛏️ Chambres
          </button>
        </div>

        <div>
          {activeTab === "residents" ? (
            <button 
              onClick={() => setIsAllocateModalOpen(true)}
              className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-750 transition-all hover:scale-[1.02]"
            >
              + Loger un Élève
            </button>
          ) : (
            <button 
              onClick={() => setIsRoomModalOpen(true)}
              className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-750 transition-all hover:scale-[1.02]"
            >
              + Ajouter une Chambre
            </button>
          )}
        </div>
      </div>

      {/* SEARCH AND DATA VIEW */}
      {activeTab === "residents" ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/20">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un résident..." 
                  className="pl-12 rounded-2xl border-slate-200 h-12 text-sm bg-white focus-visible:ring-indigo-500/20" 
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chambre</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bâtiment</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date d'arrivée</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAllocations.map((a: any) => (
                    <tr key={a.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-4">
                        <p className="font-bold text-slate-900">{a.student?.nomEtudiant}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wider">{a.student?.numAdmission}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="font-black text-indigo-600 bg-indigo-50/50 px-3 py-1.5 rounded-xl text-xs">N° {a.room?.roomNumber}</span>
                      </td>
                      <td className="px-8 py-4 text-slate-500 font-semibold text-sm">
                        {a.room?.buildingName}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500 font-medium">
                        {a.joinDate ? new Date(a.joinDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          a.status === 'Occupé' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {a.status === "Occupé" && (
                            <button 
                              onClick={() => handleVacate(a.id)}
                              className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-wider transition-all"
                            >
                              Libérer
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteAllocation(a.id)}
                            className="p-2.5 rounded-xl border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50/30 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAllocations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 font-semibold">
                        Aucun résident trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une chambre (numéro, bâtiment, type)..." 
                className="pl-12 rounded-2xl border-slate-200 h-12 text-sm bg-white focus-visible:ring-indigo-500/20" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Create Room Box Button */}
            <button 
              onClick={() => setIsRoomModalOpen(true)}
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-8 flex flex-col items-center justify-center gap-4 group hover:border-indigo-400/40 hover:bg-slate-100/30 transition-all cursor-pointer min-h-[250px]"
            >
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-indigo-600 shadow-sm transition-all">
                <Plus size={32} />
              </div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs group-hover:text-slate-600 transition-all">Ajouter une Chambre</p>
            </button>

            {filteredRooms.map((r: any) => {
              const isFull = (r.occupiedBeds || 0) >= r.capacity;
              return (
                <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/20 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[250px]">
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteRoom(r.id)}
                    className="absolute top-6 left-6 p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer la chambre"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="absolute top-6 right-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      r.roomType === 'Filles' ? 'bg-pink-50 text-pink-500 border border-pink-100' : 
                      r.roomType === 'Garçons' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                      'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {r.roomType}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-6 mt-4">
                    <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <Bed size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xl tracking-tight">Chambre {r.roomNumber}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                        <MapPin size={10} /> {r.buildingName}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <p className="font-black text-slate-400 uppercase tracking-widest">Occupation</p>
                      <p className={`font-bold ${isFull ? 'text-rose-600' : 'text-slate-700'}`}>
                        {r.occupiedBeds || 0} / {r.capacity} lits
                      </p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isFull ? 'bg-rose-500' : 'bg-indigo-600'
                        }`} 
                        style={{ width: `${Math.min(100, (((r.occupiedBeds || 0) / r.capacity) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarif Annuel</p>
                      <p className="text-lg font-black text-slate-900">{r.cost?.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">FCFA</span></p>
                    </div>
                    <button 
                      onClick={() => {
                        const roomAllocations = allocations.filter((a) => a.roomId === r.id && a.status === "Occupé");
                        setSelectedRoomDetails({ room: r, residents: roomAllocations });
                      }}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all cursor-pointer"
                    >
                      Détails
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DIALOG: ADD ROOM */}
      <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 border-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Ajouter une Chambre</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRoom} className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Numéro de Chambre *</label>
              <Input 
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                placeholder="Ex: 101, A-12"
                required
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom du Bâtiment *</label>
              <Input 
                value={buildingName}
                onChange={e => setBuildingName(e.target.value)}
                placeholder="Ex: Pavillon A, Résidence Filles"
                required
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type de Chambre</label>
                <Select value={roomType} onValueChange={(val) => setRoomType(val || "Garçons")}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="Garçons">Garçons</SelectItem>
                    <SelectItem value="Filles">Filles</SelectItem>
                    <SelectItem value="Mixte">Mixte</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacité (Lits) *</label>
                <Input 
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  required
                  className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarif de location (FCFA)</label>
              <Input 
                type="number"
                min="0"
                value={cost}
                onChange={e => setCost(e.target.value)}
                className="rounded-xl border-slate-200 focus-visible:ring-indigo-500/20"
              />
            </div>

            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRoomModalOpen(false)} className="rounded-xl text-xs font-bold">
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                {isPending ? "Création..." : "Ajouter la chambre"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ALLOCATE STUDENT */}
      <Dialog open={isAllocateModalOpen} onOpenChange={setIsAllocateModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 border-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Loger un Élève</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAllocate} className="space-y-4 pt-4">
            
             <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rechercher l'Élève</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <Input 
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Filtrer par nom ou classe..."
                    className="pl-9 rounded-xl border-slate-200 h-10 text-xs focus-visible:ring-indigo-500/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève *</label>
                <Select value={selectedStudentId} onValueChange={(val) => setSelectedStudentId(val || "")}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Choisir un élève..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl max-h-[250px]">
                    {filteredAvailableStudents.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.nomEtudiant} ({s.classe || "Sans classe"})
                      </SelectItem>
                    ))}
                    {filteredAvailableStudents.length === 0 && (
                      <div className="p-4 text-xs text-center text-slate-400 font-medium">
                        {studentSearch ? "Aucun élève correspondant" : "Aucun élève libre trouvé"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chambre Disponible *</label>
              <Select value={selectedRoomId} onValueChange={(val) => setSelectedRoomId(val || "")}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Choisir une chambre..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl max-h-[250px]">
                  {availableRooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      Chambre {r.roomNumber} - {r.buildingName} ({r.roomType}, {r.capacity - (r.occupiedBeds || 0)} lits dispos)
                    </SelectItem>
                  ))}
                  {availableRooms.length === 0 && (
                    <div className="p-4 text-xs text-center text-slate-400 font-medium">
                      Aucune chambre avec lit disponible
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAllocateModalOpen(false)} className="rounded-xl text-xs font-bold">
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                {isPending ? "Affectation..." : "Loger l'élève"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ROOM DETAILS (RESIDENTS IN ROOM) */}
      <Dialog open={!!selectedRoomDetails} onOpenChange={() => setSelectedRoomDetails(null)}>
        <DialogContent className="bg-white rounded-3xl p-6 border-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
              Résidents - Chambre {selectedRoomDetails?.room?.roomNumber}
            </DialogTitle>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">{selectedRoomDetails?.room?.buildingName}</p>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Membres Actuels ({selectedRoomDetails?.residents?.length || 0})</h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {selectedRoomDetails?.residents?.map((res: any) => (
                <div key={res.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{res.student?.nomEtudiant}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{res.student?.numAdmission}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedRoomDetails(null);
                      handleVacate(res.id);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    Libérer
                  </button>
                </div>
              ))}
              {(!selectedRoomDetails?.residents || selectedRoomDetails.residents.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-sm font-medium">
                  Cette chambre est vide pour le moment.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 flex justify-end">
            <Button onClick={() => setSelectedRoomDetails(null)} className="rounded-xl text-xs font-bold bg-slate-900 text-white">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
