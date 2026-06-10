export const dynamic = "force-dynamic";
import { getStudents, deleteStudent, fixStudentLevels } from "@/domains/students/actions/students.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import StudentDialog from "@/domains/students/components/StudentDialog";
import RepairDataButton from "@/domains/students/components/RepairDataButton";
import ActionMenu from "@/components/common/ActionMenu";
import Link from "next/link";
import { 
  Users, UserPlus, GraduationCap, LayoutGrid, List, Search, Filter, 
  MoreVertical, Edit, Bell, ChevronDown, ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Guard } from "@/components/rbac/guard";

function Plus({ size = 24, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function User({ size = 24, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StatCard({ icon, bg, title, value, sub }: any) {
  return (
    <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", bg)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black text-slate-900 leading-tight mt-0.5">{value}</h4>
        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIF") {
    return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-full">ACTIF</span>;
  }
  if (normalized === "EN ATTENTE") {
    return <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest rounded-full">EN ATTENTE</span>;
  }
  return <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest rounded-full">INACTIF</span>;
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ search?: string; view?: "grid" | "list"; page?: string }> }) {
  const params = await searchParams;
  const search = params.search || "";
  const viewMode = params.view || "grid";
  const page = Number(params.page) || 1;
  const itemsPerPage = 8;

  const result = await getStudents();
  const allStudents = (result.data as any)?.data || result.data || [];
  
  const currentUser = await getCurrentUser();
  const canEdit = currentUser?.admin || currentUser?.role?.permissions?.some(p => p.moduleName === "Students" && p.canEdit);
  const canDelete = currentUser?.admin || currentUser?.role?.permissions?.some(p => p.moduleName === "Students" && p.canDelete);

  // Performance Optimization: Student growth and new students count
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const currentYear = new Date().getFullYear();
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const nouveaux = allStudents.filter((s: any) => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const lastMonthNouveaux = allStudents.filter((s: any) => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  }).length;

  const growth = lastMonthNouveaux > 0 
    ? Math.round(((nouveaux - lastMonthNouveaux) / lastMonthNouveaux) * 100)
    : nouveaux * 100;

  const filteredStudents = allStudents.filter((s: any) => 
    s.nomEtudiant.toLowerCase().includes(search.toLowerCase()) ||
    (s.numAdmission && s.numAdmission.toLowerCase().includes(search.toLowerCase()))
  );

  const start = (page - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const actifs = allStudents.filter((s: any) => (s.statut || "").toUpperCase() === "ACTIF").length;
  const classesCount = new Set(allStudents.map((s: any) => s.classe).filter(Boolean)).size;

  const stats = {
    total: allStudents.length,
    actifs,
    nouveaux,
    growth,
    classesCount
  };

  const createPageUrl = (newPage: number, newSearch?: string, newView?: "grid" | "list") => {
    const params = new URLSearchParams();
    if (newSearch && newSearch !== "") params.set("search", newSearch);
    if (newView && newView !== "grid") params.set("view", newView);
    if (newPage > 1) params.set("page", newPage.toString());
    return params.toString() ? `?${params.toString()}` : "";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 space-y-8">
      
      {/* Header matching image */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Gestion des Étudiants</h1>
          <p className="text-slate-500 font-medium text-sm">Consultez, gérez et suivez les informations des étudiants.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-[#F8FAFC] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <img src="https://i.pravatar.cc/150?img=11" alt="Admin" className="w-10 h-10 rounded-full border border-slate-200" />
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 leading-none">Admin École</p>
                <p className="text-[10px] font-medium text-slate-500 mt-1">Administrateur</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
          <Guard module="Students" action="canEdit">
            <StudentDialog 
              mode="add" 
              trigger={
                <button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                  <Plus size={18} /> Ajouter un étudiant
                </button>
              } 
            />
          </Guard>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users size={20} className="text-indigo-600" />} 
          bg="bg-indigo-50" 
          title="Total Étudiants" 
          value={stats.total.toString()} 
          sub={`${stats.growth >= 0 ? '+' : ''}${stats.growth}% ce mois`} 
        />
        <StatCard 
          icon={<Users size={20} className="text-emerald-600" />} 
          bg="bg-emerald-50" 
          title="Étudiants Actifs" 
          value={stats.actifs.toString()} 
          sub={`${stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total`} 
        />
        <StatCard 
          icon={<div className="w-4 h-4 rounded-full border-2 border-orange-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /></div>} 
          bg="bg-orange-50" 
          title="Nouveaux" 
          value={stats.nouveaux.toString()} 
          sub="Ce mois" 
        />
        <StatCard 
          icon={<LayoutGrid size={20} className="text-blue-600" />} 
          bg="bg-blue-50" 
          title="Classes" 
          value={stats.classesCount.toString()} 
          sub="Tous les niveaux" 
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <form className="relative w-full md:w-[450px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            name="search"
            placeholder="Rechercher un étudiant par nom, ID ou admission..." 
            defaultValue={search}
            className="w-full pl-12 pr-4 h-12 bg-white rounded-2xl border border-slate-200 outline-none text-sm font-medium placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </form>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <RepairDataButton />
          
          <button className="h-12 px-6 bg-white rounded-2xl border border-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 flex items-center gap-2">
            <Filter size={16} /> Filtres
          </button>
          
          <div className="flex bg-white rounded-2xl border border-slate-200 p-1 shadow-sm h-12">
            <Link 
              href={createPageUrl(1, search, "grid")}
              className={cn("w-10 h-full rounded-xl flex items-center justify-center transition-all", viewMode === "grid" ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid size={18} />
            </Link>
            <Link 
              href={createPageUrl(1, search, "list")}
              className={cn("w-10 h-full rounded-xl flex items-center justify-center transition-all", viewMode === "list" ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <List size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Student Grid */}
      <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {paginatedStudents.length > 0 ? (
          paginatedStudents.map((student: any) => (
            <div key={student.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 overflow-hidden shrink-0 border border-slate-100">
                {student.photoPath ? (
                  <img src={student.photoPath} alt={student.nomEtudiant} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-300">
                    <User size={24} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-black text-sm text-slate-900 truncate uppercase">{student.nomEtudiant}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">ID: {student.numAdmission || student.matricule || "20 S 001"}</p>
                </div>
                
                <div className="flex flex-col gap-1 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700">{student.educationalLevel || "Collège"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-slate-500">{student.classe || "6ème"}</span>
                    <span className="text-[11px] font-semibold flex items-center gap-1">
                      {student.sexe?.toLowerCase() === 'féminin' ? (
                        <><span className="text-pink-500">♀</span> <span className="text-slate-500">Féminin</span></>
                      ) : (
                        <><span className="text-blue-500">♂</span> <span className="text-slate-500">Masculin</span></>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-2">
                <StatusBadge status={student.statut || "ACTIF"} />
                
                <ActionMenu 
                  title={`Gérer ${student.nomEtudiant}`}
                  onDelete={deleteStudent.bind(null, student.id)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  editDialog={
                    <StudentDialog 
                      mode="edit" 
                      initialData={student} 
                      trigger={
                        <button className="flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors w-full text-left">
                          <Edit size={16} />
                          <span className="font-semibold text-sm">Modifier</span>
                        </button>
                      }
                    />
                  }
                />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-slate-100 border-dashed">
            <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-500">Aucun étudiant trouvé</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredStudents.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 pb-10">
          <p className="text-xs font-semibold text-slate-500">
            Affichage {start + 1} à {Math.min(start + itemsPerPage, filteredStudents.length)} sur {filteredStudents.length} étudiants
          </p>
          
          <div className="flex items-center gap-1">
            <Link 
              href={createPageUrl(Math.max(1, page - 1), search, viewMode)}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100", page === 1 && "opacity-50 pointer-events-none")}
            >
              <ChevronLeft size={16} />
            </Link>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && page > 3) {
                pageNum = page - 2 + i;
                if (pageNum > totalPages) return null;
              }
              return (
                <Link 
                  key={pageNum}
                  href={createPageUrl(pageNum, search, viewMode)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors",
                    page === pageNum ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {pageNum}
                </Link>
              );
            })}
            
            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold text-xs">...</span>
                <Link 
                  href={createPageUrl(totalPages, search, viewMode)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
                >
                  {totalPages}
                </Link>
              </>
            )}

            <Link 
              href={createPageUrl(Math.min(totalPages, page + 1), search, viewMode)}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100", page === totalPages && "opacity-50 pointer-events-none")}
            >
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-10 bg-white shadow-sm">
            <span className="text-xs font-semibold text-slate-600">{itemsPerPage} par page</span>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      )}
      
    </div>
  );
}
