import { getEmployees, deleteEmployee } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import EmployeeDialog from "@/domains/hr/components/EmployeeDialog";
import ActionMenu from "@/components/common/ActionMenu";
import Link from "next/link";
import {
  Users, Building2, Search, Filter, LayoutGrid, List, Download,
  Eye, Edit, Phone, Mail, Lock, Bell, ChevronDown,
  ChevronLeft, ChevronRight, Plus, ClipboardCheck, QrCode, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">ACTIF</span>;
  }
  if (normalized === "EN ATTENTE") {
    return <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">EN ATTENTE</span>;
  }
  return <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">INACTIF</span>;
}

function UserAvatar({ size = 24, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 20a6 6 0 0 0-12 0" />
      <circle cx="12" cy="10" r="4" />
      <circle cx="12" cy="12" r="10" opacity="0.2" />
    </svg>
  );
}

export default async function HRPage({ searchParams }: { searchParams: Promise<{ search?: string; view?: "grid" | "list"; page?: string }> }) {
  const params = await searchParams;
  const search = params.search || "";
  const viewMode = params.view || "list";
  const page = Number(params.page) || 1;
  const itemsPerPage = 8;

  const [result, currentUser] = await Promise.all([
    getEmployees(),
    getCurrentUser()
  ]);
  const allEmployees = ((result as any).data?.data || (result as any).data || []) as any[];

  const canEdit = (currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit);
  const canDelete = (currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canDelete);

  const filteredEmployees = allEmployees.filter((e: any) =>
    e.nom.toLowerCase().includes(search.toLowerCase()) ||
    (e.empId && e.empId.toLowerCase().includes(search.toLowerCase())) ||
    (e.poste && e.poste.toLowerCase().includes(search.toLowerCase()))
  );

  const start = (page - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const actifs = allEmployees.filter((e: any) => (e.statut || "").toUpperCase() === "ACTIF").length;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const nouveaux = allEmployees.filter((e: any) => {
    if (!e.createdAt) return false;
    const d = new Date(e.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  const departementsCount = new Set(allEmployees.map((e: any) => e.departement).filter(Boolean)).size;

  const stats = { total: allEmployees.length, actifs, nouveaux, departementsCount };

  const createPageUrl = (newPage: number, newSearch?: string, newView?: "grid" | "list") => {
    const p = new URLSearchParams();
    if (newSearch && newSearch !== "") p.set("search", newSearch);
    if (newView && newView !== "list") p.set("view", newView);
    if (newPage > 1) p.set("page", newPage.toString());
    return p.toString() ? `?${p.toString()}` : "";
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 space-y-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ressources Humaines</h1>
            <span className="text-xl font-bold text-slate-400 font-arabic">الموارد البشرية</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">Gérez votre personnel et leurs contrats.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* ─── Reports Center Link ─── */}
          <Link
            href="/dashboard/hr/reports"
            className="h-11 px-5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold flex items-center gap-2 transition-all text-sm animate-fade-in"
          >
            <BarChart3 size={16} />
            Centre de Rapports
          </Link>

          {/* ─── QR Codes Link ─── */}
          <Link
            href="/dashboard/hr/attendance/qrcodes"
            className="h-11 px-5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold flex items-center gap-2 transition-all text-sm animate-fade-in"
          >
            <QrCode size={16} />
            Codes QR Classes
          </Link>

          {/* ─── Attendance Quick Link ─── */}
          <Link
            href={`/dashboard/hr/attendance?date=${today}`}
            className="h-11 px-5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2 transition-all text-sm"
          >
            <ClipboardCheck size={16} />
            Feuille de Présence
          </Link>

          {/* ─── Payroll Quick Link ─── */}
          <Link
            href="/dashboard/hr/payroll"
            className="h-11 px-5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-semibold flex items-center gap-2 transition-all text-sm"
          >
            <span className="text-base leading-none font-bold">💰</span>
            Salaires
          </Link>

          {canEdit && (
            <EmployeeDialog
              mode="add"
              trigger={
                <button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                  <Plus size={18} /> Ajouter un employé
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} className="text-indigo-600" />}
          bg="bg-indigo-50"
          title="Total Employés"
          value={stats.total.toString()}
          sub={`${stats.actifs} actifs`}
        />
        <StatCard
          icon={<Users size={20} className="text-emerald-600" />}
          bg="bg-emerald-50"
          title="Employés Actifs"
          value={stats.actifs.toString()}
          sub={`${stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total`}
        />
        <StatCard
          icon={<div className="w-4 h-4 rounded-full border-2 border-orange-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /></div>}
          bg="bg-orange-50"
          title="Nouveaux"
          value={stats.nouveaux.toString()}
          sub="Ce mois-ci"
        />
        <StatCard
          icon={<Building2 size={20} className="text-blue-600" />}
          bg="bg-blue-50"
          title="Départements"
          value={stats.departementsCount.toString()}
          sub="Tous les départements"
        />
      </div>

      {/* ─── Search & View Controls ─── */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <form className="relative w-full md:w-[450px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            name="search"
            placeholder="Rechercher un employé par nom, ID ou poste..."
            defaultValue={search}
            className="w-full pl-12 pr-4 h-12 bg-white rounded-2xl border border-slate-200 outline-none text-sm font-medium placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
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

          <button className="h-12 w-12 flex items-center justify-center bg-white rounded-2xl border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* ─── Employee Table ─── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-x-auto w-full scrollbar-thin">
        <table className="min-w-[1800px] text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <th rowSpan={2} className="w-[60px] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">
                N°
              </th>
              <th colSpan={7} className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100 bg-indigo-50/20">
                IDENTIFICATION DE L'AGENT <span className="text-[9px] font-bold text-slate-400 font-arabic ml-1">(تعريف الوكيل)</span>
              </th>
              <th colSpan={4} className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100 bg-amber-50/20">
                GRADE DE L'AGENT <span className="text-[9px] font-bold text-slate-400 font-arabic ml-1">(درجة الوكيل)</span>
              </th>
              <th colSpan={2} className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100 bg-blue-50/20">
                POSTE OCCUPÉ <span className="text-[9px] font-bold text-slate-400 font-arabic ml-1">(الوظيفة الشاغرة)</span>
              </th>
              <th colSpan={5} className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center border-r border-slate-100 bg-emerald-50/20">
                AFFECTATION <span className="text-[9px] font-bold text-slate-400 font-arabic ml-1">(التعيين)</span>
              </th>
              <th rowSpan={2} className="w-[120px] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">
                salaireBase
              </th>
              <th rowSpan={2} className="w-[100px] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">
                Statut
              </th>
              <th rowSpan={2} className="w-[110px] px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">
                Actions
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-600">
              {/* Identification */}
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">MATRICULE</th>
              <th className="w-[200px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">NOM ET PRÉNOM</th>
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">DATE DE NAIS.</th>
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">LIEU DE NAIS.</th>
              <th className="w-[70px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">sexe</th>
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">MOBILE</th>
              <th className="w-[160px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">EMAIL</th>
              
              {/* Grade */}
              <th className="w-[100px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">CODE GRADE</th>
              <th className="w-[100px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">CATÉGORIE</th>
              <th className="w-[100px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">CLASSE</th>
              <th className="w-[100px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">ÉCHELON</th>
              
              {/* Poste */}
              <th className="w-[140px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">FONCTION</th>
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">DATE NOMIN.</th>
              
              {/* Affectation */}
              <th className="w-[160px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">LIEU D’AFFEC.</th>
              <th className="w-[110px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">COMMUNE</th>
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">DÉPARTEMENT</th>
              <th className="w-[110px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">RÉGION</th>
              <th className="w-[120px] px-4 py-3 text-[9px] font-bold uppercase tracking-wider text-center border-r border-slate-100">DATE AFFEC.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedEmployees.length > 0 ? (
              paginatedEmployees.map((employee: any, idx: number) => (
                <tr key={employee.id} className="group hover:bg-slate-50/50 transition-all text-xs text-slate-700">
                  <td className="px-4 py-4 text-center border-r border-slate-100 font-bold text-slate-400">
                    {start + idx + 1}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100 font-semibold text-slate-800">
                    {employee.empId}
                  </td>
                  <td className="px-4 py-4 border-r border-slate-100 font-black text-slate-900 uppercase truncate">
                    {employee.nom}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.dateNaissance || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100 truncate">
                    {employee.lieuNaissance || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.sexe || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.mobile || "-"}
                  </td>
                  <td className="px-4 py-4 border-r border-slate-100 text-slate-500 truncate">
                    {employee.email || "-"}
                  </td>
                  
                  {/* Grade */}
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.codeGrade || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.categorie || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.classe || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.echelon || "-"}
                  </td>
                  
                  {/* Poste */}
                  <td className="px-4 py-4 text-center border-r border-slate-100 font-semibold truncate">
                    {employee.fonction || employee.poste || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.dateNomination || "-"}
                  </td>
                  
                  {/* Affectation */}
                  <td className="px-4 py-4 text-center border-r border-slate-100 truncate">
                    {employee.lieuAffectation || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100 truncate">
                    {employee.commune || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100 truncate">
                    {employee.departement || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100 truncate">
                    {employee.region || "-"}
                  </td>
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    {employee.dateAffectation || "-"}
                  </td>
                  
                  {/* Autre / salaireBase */}
                  <td className="px-4 py-4 text-center border-r border-slate-100 font-bold text-slate-800">
                    {employee.salaireBase ? `${Math.round(employee.salaireBase).toLocaleString("fr-FR")} CFA` : "0 CFA"}
                  </td>
                  
                  {/* Statut */}
                  <td className="px-4 py-4 text-center border-r border-slate-100">
                    <StatusBadge status={employee.statut || "Actif"} />
                  </td>
                  
                  {/* Actions */}
                  <td className="px-4 py-4 text-right pr-8">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <EmployeeDialog
                          mode="edit"
                          initialData={employee}
                          trigger={
                            <button className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                              <Edit size={14} />
                            </button>
                          }
                        />
                      )}
                      <div className="inline-block">
                        <ActionMenu
                          title={`Gérer ${employee.nom}`}
                          onDelete={canDelete ? deleteEmployee.bind(null, employee.id) : undefined}
                          canEdit={canEdit}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={23} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <Users size={64} />
                    <p className="text-xl font-bold">Aucun employé trouvé</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination ─── */}
      {filteredEmployees.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2 pb-10">
          <p className="text-xs font-semibold text-slate-500">
            Affichage {start + 1} à {Math.min(start + itemsPerPage, filteredEmployees.length)} sur {filteredEmployees.length} employés
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
