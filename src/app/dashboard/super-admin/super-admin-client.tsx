"use client";

import React, { useState, useTransition } from "react";
import { 
  Building2, 
  Users, 
  Globe, 
  ShieldCheck, 
  BarChart3, 
  Settings2,
  AlertTriangle,
  Search,
  Plus,
  X,
  Filter,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createSchoolAction, updateSchoolStatus } from "@/domains/auth/actions/super-admin.actions";

type SchoolType = {
  id: number | string;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  createdAt: Date | string | number;
};

type StatsType = {
  totalSchools: number;
  totalStudents: number;
  activeSchools: number;
  revenue: number;
};

export default function SuperAdminClient({
  initialSchools,
  stats,
  user
}: {
  initialSchools: SchoolType[];
  stats: StatsType;
  user: any;
}) {
  const [schools, setSchools] = useState<SchoolType[]>(initialSchools);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals visibility states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType | null>(null);

  // Form states for manual school creation
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createPlan, setCreatePlan] = useState("basic");
  const [createStatus, setCreateStatus] = useState("active");
  const [createError, setCreateError] = useState("");
  const [isCreating, startCreateTransition] = useTransition();

  // Form states for editing school
  const [editPlan, setEditPlan] = useState("basic");
  const [editStatus, setEditStatus] = useState("active");
  const [editError, setEditError] = useState("");
  const [isEditing, startEditTransition] = useTransition();

  // Calculate actual revenue based on plan pricing
  const calculateRevenue = () => {
    return schools
      .filter(s => s.status === "active")
      .reduce((acc, s) => {
        const monthlyCost = s.plan === "pro" ? 49000 : s.plan === "enterprise" ? 150000 : 19000;
        return acc + monthlyCost;
      }, 0);
  };

  // Filtered schools
  const filteredSchools = schools.filter((school) => {
    const matchesSearch = 
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      school.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = planFilter === "all" || school.plan === planFilter;
    const matchesStatus = statusFilter === "all" || school.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Handle open create modal
  const openCreateModal = () => {
    setCreateName("");
    setCreateSlug("");
    setCreatePlan("basic");
    setCreateStatus("active");
    setCreateError("");
    setIsCreateOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (school: SchoolType) => {
    setSelectedSchool(school);
    setEditPlan(school.plan || "basic");
    setEditStatus(school.status || "active");
    setEditError("");
    setIsEditOpen(true);
  };

  // Handle Create School
  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createName.trim()) {
      setCreateError("Le nom de l'école est requis.");
      return;
    }
    if (!createSlug.trim()) {
      setCreateError("Le sous-domaine (slug) est requis.");
      return;
    }

    startCreateTransition(async () => {
      try {
        const res = await createSchoolAction(createName, createSlug, createPlan, createStatus);
        if (res.success) {
          toast.success(`L'école "${createName}" a été créée avec succès !`);
          
          // Re-populate local state with the new school (mocked entry or refetch)
          const newSchool: SchoolType = {
            id: Math.random().toString(36).substr(2, 9), // Temp client id
            name: createName.trim(),
            slug: createSlug.trim().toLowerCase(),
            plan: createPlan,
            status: createStatus,
            createdAt: new Date()
          };
          
          setSchools(prev => [newSchool, ...prev]);
          setIsCreateOpen(false);
        } else {
          setCreateError(res.error || "Une erreur est survenue.");
        }
      } catch (err: any) {
        setCreateError(err.message || "Erreur réseau.");
      }
    });
  };

  // Handle Update School
  const handleUpdateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    if (!selectedSchool) return;

    startEditTransition(async () => {
      try {
        const res = await updateSchoolStatus(Number(selectedSchool.id), {
          plan: editPlan,
          status: editStatus
        });
        
        if (res.success) {
          toast.success("Les informations de l'école ont été mises à jour !");
          
          setSchools(prev => prev.map(s => 
            s.id === selectedSchool.id 
              ? { ...s, plan: editPlan, status: editStatus } 
              : s
          ));
          setIsEditOpen(false);
        } else {
          setEditError(res.error || "Une erreur est survenue.");
        }
      } catch (err: any) {
        setEditError(err.message || "Erreur réseau.");
      }
    });
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <ShieldCheck className="text-blue-600 w-9 h-9" />
            Tableau de bord du Super Admin
          </h1>
          <p className="text-slate-500 font-semibold mt-1">
            Gestion de la plateforme, enregistrement des établissements et des abonnements.
          </p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 text-white font-black text-xs uppercase tracking-wider rounded-2xl h-12 px-6 gap-2 cursor-pointer transition-all"
        >
          <Plus size={16} />
          Ajouter une école
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total des écoles", value: schools.length, icon: Building2, color: "blue", bg: "bg-blue-50 text-blue-600" },
          { label: "Total des élèves", value: stats.totalStudents, icon: Users, color: "indigo", bg: "bg-indigo-50 text-indigo-600" },
          { label: "Écoles actives", value: schools.filter(s => s.status === "active").length, icon: Globe, color: "emerald", bg: "bg-emerald-50 text-emerald-600" },
          { label: "Revenu mensuel estimé", value: `${calculateRevenue().toLocaleString("fr-FR")} F CFA`, icon: BarChart3, color: "amber", bg: "bg-amber-50 text-amber-600" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all rounded-[2rem] bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400 mb-1 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                  <stat.icon size={22} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Schools Management Section */}
      <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
              <Building2 className="text-slate-400" size={22} />
              Liste des établissements abonnés
            </CardTitle>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 bg-slate-50 border-none rounded-xl pl-10 pr-4 font-semibold text-sm text-slate-700 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner"
                />
              </div>

              {/* Plan Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="text-slate-400 shrink-0" size={16} />
                <select 
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="h-11 bg-slate-50 border-none rounded-xl px-4 font-semibold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Tous les forfaits</option>
                  <option value="basic">Forfait Basique</option>
                  <option value="pro">Forfait Professionnel</option>
                  <option value="enterprise">Forfait Entreprise</option>
                </select>
              </div>

              {/* Status Filter */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 bg-slate-50 border-none rounded-xl px-4 font-semibold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-auto"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSchools.length === 0 ? (
            <div className="p-16 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold text-lg">Aucun établissement ne correspond à votre recherche.</p>
              <p className="text-slate-400 text-sm mt-1">Essayez de modifier vos filtres ou d'ajouter une nouvelle école.</p>
            </div>
          ) : (
            <Table dir="ltr">
              <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow>
                  <TableHead className="text-left font-black py-5 pl-8 text-xs text-slate-400 uppercase tracking-widest">Nom de l’école</TableHead>
                  <TableHead className="text-left font-black text-xs text-slate-400 uppercase tracking-widest">Domaine de Connexion</TableHead>
                  <TableHead className="text-left font-black text-xs text-slate-400 uppercase tracking-widest">Forfait</TableHead>
                  <TableHead className="text-left font-black text-xs text-slate-400 uppercase tracking-widest">Statut</TableHead>
                  <TableHead className="text-left font-black text-xs text-slate-400 uppercase tracking-widest">Date de création</TableHead>
                  <TableHead className="text-center font-black text-xs text-slate-400 uppercase tracking-widest pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.map((school) => (
                  <TableRow key={school.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/60">
                    <TableCell className="font-bold text-slate-900 py-5 pl-8">{school.name}</TableCell>
                    <TableCell className="font-mono text-sm text-blue-600">
                      {school.slug}.edut.pro
                    </TableCell>
                    <TableCell>
                      <Badge className={`px-2.5 py-1 rounded-lg border-none text-[10px] font-black uppercase tracking-wider
                        ${school.plan === "pro" ? "bg-indigo-50 text-indigo-600" : school.plan === "enterprise" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}
                      >
                        {school.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`px-2.5 py-1 rounded-lg border-none text-[10px] font-black uppercase tracking-wider
                        ${school.status === "active" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
                      >
                        {school.status === "active" ? "Actif" : "Suspendu"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm font-semibold">
                      {new Date(school.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-center pr-8">
                      <Button 
                        onClick={() => openEditModal(school)}
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Settings2 size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE SCHOOL MODAL (Custom HTML/CSS popup for reliability & elegance) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-100 transform transition-all scale-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Ajouter un établissement</h3>
                <p className="text-blue-100 text-xs font-semibold mt-1">Créez manuellement un nouvel espace d'école sur la plateforme.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateSchool} className="p-8 space-y-6">
              {createError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* School Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nom de l'établissement</label>
                  <input 
                    type="text" 
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ex: École Privée Les Champions"
                    className="w-full h-13 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm text-slate-800 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                {/* Subdomain (Slug) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sous-domaine (slug)</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      value={createSlug}
                      onChange={(e) => setCreateSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                      placeholder="champions"
                      className="w-full h-13 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm text-slate-800 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 text-right pr-2"
                      required
                    />
                    <span className="text-slate-500 font-bold text-sm bg-slate-100 px-4 h-13 rounded-xl flex items-center shrink-0">
                      .edut.pro
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1 font-semibold">Caractères alphanumériques et tirets uniquement.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Plan Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Forfait initial</label>
                    <select 
                      value={createPlan}
                      onChange={(e) => setCreatePlan(e.target.value)}
                      className="w-full h-13 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="basic">Basique</option>
                      <option value="pro">Professionnel</option>
                      <option value="enterprise">Entreprise</option>
                    </select>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Statut initial</label>
                    <select 
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value)}
                      className="w-full h-13 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="active">Actif</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 h-13 rounded-2xl font-black text-xs uppercase tracking-wider border-none"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white h-13 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-blue-100 cursor-pointer"
                >
                  {isCreating ? "Création..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCHOOL MODAL */}
      {isEditOpen && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-100 transform transition-all scale-100">
            {/* Modal Header */}
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Gérer l'établissement</h3>
                <p className="text-slate-300 text-xs font-semibold mt-1">Modifiez le forfait ou suspendez/activez l'établissement.</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-white/85 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleUpdateSchool} className="p-8 space-y-6">
              {editError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* School Context (Read-only) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Établissement sélectionné</label>
                  <div className="h-13 bg-slate-100 border-none rounded-xl px-4 font-bold text-sm text-slate-700 flex items-center">
                    {selectedSchool.name}
                  </div>
                  <p className="text-[10px] text-slate-400 pl-1 font-mono">{selectedSchool.slug}.edut.pro</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Plan Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Forfait</label>
                    <select 
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="w-full h-13 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-500/20"
                    >
                      <option value="basic">Basique</option>
                      <option value="pro">Professionnel</option>
                      <option value="enterprise">Entreprise</option>
                    </select>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Statut d'accès</label>
                    <select 
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full h-13 bg-slate-50 border-none rounded-xl px-4 font-bold text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-500/20"
                    >
                      <option value="active">Actif</option>
                      <option value="suspended">Suspendu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 h-13 rounded-2xl font-black text-xs uppercase tracking-wider border-none"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isEditing}
                  className="w-1/2 bg-slate-900 hover:bg-slate-800 text-white h-13 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  {isEditing ? "Mise à jour..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
