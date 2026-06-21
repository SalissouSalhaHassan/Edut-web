"use client";

import { useState, useTransition, useMemo } from "react";
import {
  updateSchoolStatus,
  updateSchoolPlan,
  impersonateSchool,
  updateSchoolCustomDomain,
} from "@/domains/platform/actions/platform.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Eye,
  Power,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  ExternalLink,
  Loader2,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 10;
const PRIMARY_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "edut.pro";

type HostMode = "localhost" | "primary-domain" | "single-deployment";
type SchoolRecord = {
  id: number;
  name: string;
  slug: string;
  customDomain?: string | null;
  logoPath?: string | null;
  plan?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
};

function planBadge(plan: string | null | undefined) {
  if (plan === "premium" || plan === "enterprise") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
        PREMIUM
      </span>
    );
  }
  if (plan === "basic") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
        BASIC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
      GRATUIT
    </span>
  );
}

export function SchoolManagerNew({ schools: initialSchools }: { schools: SchoolRecord[] }) {
  const [schools, setSchools] = useState(initialSchools);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedSchoolForDomain, setSelectedSchoolForDomain] = useState<SchoolRecord | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isDomainSaving, setIsDomainSaving] = useState(false);

  const hostConfig = useMemo<{ baseDomain: string; mode: HostMode }>(() => {
    if (typeof window === "undefined") {
      return { baseDomain: PRIMARY_DOMAIN, mode: "primary-domain" };
    }

    const host = window.location.host;
    const hostname = window.location.hostname;

    if (host.includes("localhost")) {
      return { baseDomain: host, mode: "localhost" };
    }

    if (hostname === PRIMARY_DOMAIN || hostname.endsWith(`.${PRIMARY_DOMAIN}`)) {
      return { baseDomain: PRIMARY_DOMAIN, mode: "primary-domain" };
    }

    return { baseDomain: host, mode: "single-deployment" };
  }, []);

  const getSchoolUrl = (school: SchoolRecord) => {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    const customDomain = typeof school.customDomain === "string" ? school.customDomain.trim() : "";

    if (customDomain) {
      return customDomain.startsWith("http") ? customDomain : `${protocol}//${customDomain}`;
    }

    if (hostConfig.mode === "single-deployment") {
      return null;
    }

    return `${protocol}//${school.slug}.${hostConfig.baseDomain}`;
  };

  const getSchoolDomainLabel = (school: SchoolRecord) => {
    const customDomain = typeof school.customDomain === "string" ? school.customDomain.trim() : "";
    if (customDomain) return customDomain.replace(/^https?:\/\//, "");
    if (hostConfig.mode === "single-deployment") return school.slug;
    return `${school.slug}.${hostConfig.baseDomain}`;
  };

  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const matchesSearch =
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || school.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schools, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  const pagedSchools = filteredSchools.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleImpersonate = (schoolId: number) => {
    startTransition(async () => {
      const res = await impersonateSchool(schoolId);
      if (res.success) {
        toast.success("Connexion réussie. Redirection...");
        window.location.href = "/dashboard";
      } else {
        toast.error("Échec de la connexion.");
      }
    });
  };

  const handleToggleStatus = (schoolId: number, currentStatus: string) => {
    const newStatus: "active" | "suspended" = currentStatus === "active" ? "suspended" : "active";
    startTransition(async () => {
      const res = await updateSchoolStatus(schoolId, newStatus);
      if (res.success) {
        setSchools((prev) =>
          prev.map((s) => (s.id === schoolId ? { ...s, status: newStatus } : s))
        );
        toast.success(`École ${newStatus === "active" ? "activée" : "suspendue"}.`);
      }
    });
  };

  const handleExportCSV = () => {
    const header = ["Nom", "Slug", "Forfait", "Statut", "Créé le"];
    const rows = filteredSchools.map((s) => [
      s.name,
      s.slug,
      s.plan || "basic",
      s.status || "active",
      s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR") : "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "ecoles.csv";
    link.click();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-6 py-4 border-b border-slate-50">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une école ou un domaine..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-100 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer select-none" />
              }
              nativeButton={false}
            >
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              Statut :{" "}
              {statusFilter === "all"
                ? "Tous"
                : statusFilter === "active"
                ? "Actifs"
                : "Suspendus"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-xl border-slate-100">
              <DropdownMenuItem onClick={() => { setStatusFilter("all"); setPage(1); }} className="rounded-lg text-xs font-semibold p-2.5 cursor-pointer">Tous</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("active"); setPage(1); }} className="rounded-lg text-xs font-semibold p-2.5 cursor-pointer text-emerald-600">Actifs</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("suspended"); setPage(1); }} className="rounded-lg text-xs font-semibold p-2.5 cursor-pointer text-rose-600">Suspendus</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">École</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Domaine</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Forfait</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</th>
              <th className="px-6 py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pagedSchools.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <p className="text-sm font-semibold text-slate-400">
                    Aucune école ne correspond à votre recherche.
                  </p>
                </td>
              </tr>
            ) : (
              pagedSchools.map((school) => {
                const schoolUrl = getSchoolUrl(school);
                const domainLabel = getSchoolDomainLabel(school);
                const initials = school.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w: string) => w[0].toUpperCase())
                  .join("");

                // Pick a color based on initials hash
                const colors = [
                  "bg-indigo-100 text-indigo-700",
                  "bg-blue-100 text-blue-700",
                  "bg-violet-100 text-violet-700",
                  "bg-emerald-100 text-emerald-700",
                  "bg-amber-100 text-amber-700",
                ];
                const colorClass = colors[school.id % colors.length];

                return (
                  <tr key={school.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* School name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 overflow-hidden ${!school.logoPath ? colorClass : ""}`}>
                          {school.logoPath ? (
                            <img src={school.logoPath} alt={school.name} className="w-full h-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{school.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Inscrit le {school.createdAt ? new Date(school.createdAt).toLocaleDateString("fr-FR") : "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (schoolUrl) {
                            window.open(schoolUrl, "_blank", "noopener,noreferrer");
                          } else {
                            handleImpersonate(school.id);
                          }
                        }}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 transition-colors group/link"
                      >
                        <span className="text-sm font-semibold underline decoration-indigo-200 underline-offset-2">
                          {domainLabel}
                        </span>
                        {schoolUrl ? (
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        ) : (
                          <Eye className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">{planBadge(school.plan)}</td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            school.status === "active"
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                              : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                          )}
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {school.status === "active" ? "Actif" : "Suspendu"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <div className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all mx-auto cursor-pointer select-none" />
                          }
                          nativeButton={false}
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Settings className="w-4 h-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-64 rounded-2xl p-2 shadow-2xl border-slate-100 animate-in fade-in zoom-in-95 duration-200"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">
                              Options
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleImpersonate(school.id)}
                              className="rounded-xl font-semibold gap-3 p-3 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer text-sm"
                            >
                              <div className="size-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                              Accès Administrateur
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(school.id, school.status || "active")}
                              className={cn(
                                "rounded-xl font-semibold gap-3 p-3 cursor-pointer text-sm",
                                school.status === "active"
                                  ? "text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                                  : "text-emerald-600 focus:bg-emerald-50 focus:text-emerald-600"
                              )}
                            >
                              <div
                                className={cn(
                                  "size-7 rounded-lg flex items-center justify-center shrink-0",
                                  school.status === "active"
                                    ? "bg-rose-100 text-rose-600"
                                    : "bg-emerald-100 text-emerald-600"
                                )}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </div>
                              {school.status === "active" ? "Suspendre" : "Rétablir"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchoolForDomain(school);
                                setDomainInput(school.customDomain || "");
                                setIsDomainOpen(true);
                              }}
                              className="rounded-xl font-semibold gap-3 p-3 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer text-sm"
                            >
                              <div className="size-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <Globe className="w-3.5 h-3.5" />
                              </div>
                              Domaine Perso
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="my-1 bg-slate-50" />
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">
                              Changer de Forfait
                            </DropdownMenuLabel>
                            {["basic", "premium", "enterprise"].map((plan) => (
                              <DropdownMenuItem
                                key={plan}
                                disabled={school.plan === plan}
                                onClick={() => {
                                  startTransition(async () => {
                                    const res = await updateSchoolPlan(school.id, plan as "basic" | "premium" | "enterprise");
                                    if (res.success) {
                                      setSchools((prev) =>
                                        prev.map((s) => (s.id === school.id ? { ...s, plan } : s))
                                      );
                                      toast.success(`Forfait ${plan.toUpperCase()} appliqué.`);
                                    }
                                  });
                                }}
                                className="rounded-xl font-semibold gap-3 p-3 cursor-pointer text-xs focus:bg-slate-50 capitalize"
                              >
                                <div
                                  className={cn(
                                    "size-7 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                    school.plan === plan
                                      ? "bg-emerald-100 text-emerald-600"
                                      : "bg-slate-100 text-slate-400"
                                  )}
                                >
                                  {school.plan === plan ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <span className="w-3 h-3" />
                                  )}
                                </div>
                                {plan}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50 bg-slate-50/30">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Lignes par page</span>
          <span className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-slate-700">
            {PAGE_SIZE}
            <ChevronLeft className="w-3 h-3 rotate-90 text-slate-400" />
          </span>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Affichage de {Math.min((page - 1) * PAGE_SIZE + 1, filteredSchools.length)} à{" "}
          {Math.min(page * PAGE_SIZE, filteredSchools.length)} sur {filteredSchools.length} école
          {filteredSchools.length !== 1 ? "s" : ""}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "w-7 h-7 rounded-lg border text-xs font-bold transition-colors",
                page === p
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dialog for editing custom domain */}
      <Dialog open={isDomainOpen} onOpenChange={setIsDomainOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
              <Globe size={32} />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Domaine Personnalisé</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium italic">
              Configurez le nom de domaine personnalisé pour {selectedSchoolForDomain?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Nom de Domaine
              </Label>
              <Input
                id="domain"
                placeholder="Ex: portal.schoolname.edu"
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-normal pl-1">
                Laissez vide pour supprimer le domaine personnalisé et utiliser le sous-domaine par défaut.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800">⚠️ Configuration DNS requise :</p>
              <p>L'établissement doit configurer ces enregistrements chez son fournisseur de nom de domaine :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Enregistrement CNAME</strong> : pointe vers <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">cname.vercel-dns.com</code></li>
                <li><strong>Ou Enregistrement A</strong> : pointe vers l'adresse IP <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">76.76.21.21</code></li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-bold"
              onClick={() => setIsDomainOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isDomainSaving}
              className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-widest transition-all"
              onClick={async () => {
                if (!selectedSchoolForDomain) return;
                setIsDomainSaving(true);
                try {
                  const res = await updateSchoolCustomDomain(
                    selectedSchoolForDomain.id,
                    domainInput.trim() === "" ? null : domainInput.trim()
                  );
                  if (res.success) {
                    setSchools((prev) =>
                      prev.map((s) =>
                        s.id === selectedSchoolForDomain.id
                          ? { ...s, customDomain: domainInput.trim() === "" ? null : domainInput.trim() }
                          : s
                      )
                    );
                    toast.success("Domaine personnalisé mis à jour avec succès !");
                    setIsDomainOpen(false);
                  } else {
                    toast.error("Une erreur est survenue lors de la mise à jour.");
                  }
                } catch (error: any) {
                  toast.error(error.message || "Erreur de connexion.");
                } finally {
                  setIsDomainSaving(false);
                }
              }}
            >
              {isDomainSaving ? <Loader2 className="animate-spin size-5" /> : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
