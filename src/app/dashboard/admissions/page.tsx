"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Search,
  Filter,
  Eye,
  Plus,
  Trash2,
  Check,
  Send,
  Loader2,
  Calendar,
  Phone,
  MessageSquare,
  Award,
  BookOpen,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  QrCode,
  Share2,
  Copy,
  Printer,
  Globe,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  getAdmissionsDashboardStats,
  getAdmissionApplicationsList,
  submitAdmissionApplicationAction,
  reviewAdmissionApplicationAction,
  deleteAdmissionApplicationAction,
  getPublicSchoolInfoForAdmissionsAction,
} from "@/domains/admissions/actions/admissions.actions";
import { Settings } from "lucide-react";

export default function AdmissionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingReview: 0,
    admitted: 0,
    rejected: 0,
  });

  const [applications, setApplications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [classesList, setClassesList] = useState<string[]>([]);

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [assignedClass, setAssignedClass] = useState("");

  // Share & QR Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [publicUrl, setPublicUrl] = useState("https://edut.pro/admissions/apply");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}/admissions/apply`);
    }
  }, []);

  // New Direct Application Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newApp, setNewApp] = useState({
    studentFirstName: "",
    studentLastName: "",
    dateOfBirth: "",
    gender: "M",
    placeOfBirth: "Niamey",
    nationality: "Nigérienne",
    targetClass: "6ème A",
    previousSchool: "",
    previousGradeAvg: "",
    parentName: "",
    parentRelation: "Père",
    parentPhone: "",
    parentWhatsapp: "",
    parentEmail: "",
    parentProfession: "",
    address: "",
    city: "Niamey",
    medicalNotes: "",
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, listRes, schoolInfoRes] = await Promise.all([
        getAdmissionsDashboardStats(),
        getAdmissionApplicationsList({
          status: statusFilter,
          targetClass: classFilter,
          query: searchQuery,
        }),
        getPublicSchoolInfoForAdmissionsAction(),
      ]);

      if (statsRes) setStats((statsRes as any)?.data || statsRes);
      const apps = (listRes as any)?.data?.applications || (listRes as any)?.applications || [];
      setApplications(apps);

      // ── Load real classes from school_classes table (set in /settings?tab=academic)
      if (schoolInfoRes?.classes && schoolInfoRes.classes.length > 0) {
        setClassesList(schoolInfoRes.classes);
        // Always sync targetClass to the first real class from settings
        setNewApp((prev) => ({ ...prev, targetClass: schoolInfoRes.classes[0] }));
      }
    } catch (err: any) {
      toast.error("Erreur de chargement des admissions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, classFilter, searchQuery]);

  const handleOpenReview = (app: any) => {
    setSelectedApp(app);
    setAssignedClass(app.targetClass);
    setReviewNotes(app.reviewNotes || "");
    setIsReviewModalOpen(true);
  };

  const handleDecision = async (decision: "Admis / Accepté" | "Refusé" | "Liste d'attente") => {
    if (!selectedApp) return;

    try {
      setIsSubmittingReview(true);
      const res = await reviewAdmissionApplicationAction({
        applicationId: selectedApp.id,
        decision,
        reviewNotes,
        assignedClass,
      });

      const payload = (res as any)?.data || res;
      if (payload?.success) {
        if (decision === "Admis / Accepté") {
          toast.success(`Candidat admis avec succès ! Matricule généré : ${payload.matricule || "Nouveau"}`);
        } else {
          toast.success(`Dossier mis à jour (${decision}).`);
        }
        setIsReviewModalOpen(false);
        loadData();
      } else if (res?.error || payload?.error) {
        toast.error(res?.error || payload?.error);
      }
    } catch (err: any) {
      toast.error("Erreur lors du traitement de la décision.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCreateDirectApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.studentFirstName || !newApp.studentLastName || !newApp.dateOfBirth || !newApp.parentPhone) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setIsSubmittingNew(true);
      const res = await submitAdmissionApplicationAction(newApp);

      if (res.success) {
        toast.success(`Dossier ${res.applicationNumber} créé avec succès ! Accusé envoyé par SMS/WhatsApp.`);
        setIsAddModalOpen(false);
        setNewApp({
          studentFirstName: "",
          studentLastName: "",
          dateOfBirth: "",
          gender: "M",
          placeOfBirth: "Niamey",
          nationality: "Nigérienne",
          targetClass: classesList[0] || "6ème A", // Use first real class from settings
          previousSchool: "",
          previousGradeAvg: "",
          parentName: "",
          parentRelation: "Père",
          parentPhone: "",
          parentWhatsapp: "",
          parentEmail: "",
          parentProfession: "",
          address: "",
          city: "Niamey",
          medicalNotes: "",
        });
        loadData();
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error("Erreur lors de la création du dossier.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Voulez-vous supprimer ce dossier de candidature ?")) return;
    try {
      const res = await deleteAdmissionApplicationAction(id);
      if (res?.success) {
        toast.success("Dossier supprimé.");
        loadData();
      }
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Lien d'inscription copié dans le presse-papier !");
  };

  // classesList is dynamically loaded from school_classes (configured in /settings?tab=academic)
  // Fallback to a default list only if school has no classes configured yet
  const CLASSES_LIST = classesList.length > 0
    ? classesList
    : ["CI", "CP", "CE1", "CE2", "CM1", "CM2",
       "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B", "3ème A", "3ème B",
       "2nde C", "2nde A", "1ère D", "1ère A", "Terminale D", "Terminale A", "Terminale C"];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto font-sans">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <UserPlus className="size-3.5" /> Portail Admissions & Inscriptions
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Admissions & Nouvelles Inscriptions 📝
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl font-medium">
            Gestion des candidatures en ligne, attribution automatique du Matricule et portail public accessible par QR Code et lien direct pour les parents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition shadow-lg"
          >
            <QrCode className="size-4 text-emerald-400" />
            Lien Public & QR Code
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition transform active:scale-95"
          >
            <Plus className="size-4" /> Nouveau Dossier
          </button>
        </div>
      </div>

      {/* ─── KPI Stats Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-2xl">
            <Users className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Candidatures</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalApplications}</h3>
            <p className="text-xs text-slate-400">Dossiers déposés</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-2xl">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">En Attente d'Examen</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.pendingReview}</h3>
            <p className="text-xs text-slate-400">À délibérer</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admis / Acceptés</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.admitted}</h3>
            <p className="text-xs text-slate-400">Matricules générés</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-2xl">
            <XCircle className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejetés / Listes</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.rejected}</h3>
            <p className="text-xs text-slate-400">Dossiers non retenus</p>
          </div>
        </div>
      </div>

      {/* ─── Public Portal Promotion Banner ───────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border border-emerald-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="size-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <Globe className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Votre portail d'inscription public est ouvert !
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Les parents peuvent s'inscrire depuis chez eux via le lien sécurisé ou en scannant le QR code.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyPublicLink}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition shadow-sm"
          >
            <Copy className="size-3.5" />
            Copier le Lien
          </button>
          <a
            href="/admissions/apply"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <ExternalLink className="size-3.5" />
            Tester le Formulaire
          </a>
        </div>
      </div>

      {/* ─── Filter & Search Bar ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par n° de dossier, élève, parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="En attente">🟡 En attente</option>
            <option value="En examen">🔵 En examen</option>
            <option value="Admis / Accepté">🟢 Admis / Accepté</option>
            <option value="Liste d'attente">⏳ Liste d'attente</option>
            <option value="Refusé">🔴 Refusé</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Toutes les classes</option>
            {CLASSES_LIST.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Notice: No Classes Configured ─────────────────────────────────── */}
      {!isLoading && classesList.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-600/40 rounded-2xl px-5 py-3.5 text-xs">
          <Settings className="size-4 text-amber-500 shrink-0" />
          <p className="text-amber-800 dark:text-amber-300 font-medium flex-1">
            Aucune classe configurée pour cette école. Les classes affichées sont des valeurs par défaut.
          </p>
          <Link
            href="/dashboard/settings?tab=academic"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition"
          >
            <Settings className="size-3" />
            Configurer les classes
          </Link>
        </div>
      )}

      {/* ─── Applications Table ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">N° Dossier</th>
                <th className="py-3.5 px-4">Élève Candidat</th>
                <th className="py-3.5 px-4">Classe</th>
                <th className="py-3.5 px-4">Parent / Contact</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Date de Dépôt</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Chargement des dossiers...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucun dossier de candidature trouvé.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {app.applicationNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {app.studentLastName?.toUpperCase()} {app.studentFirstName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {app.gender === "M" ? "Garçon" : "Fille"} • Né(e) le {app.dateOfBirth}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                        {app.targetClass}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{app.parentName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{app.parentPhone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {app.status === "Admis / Accepté" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" /> Admis
                        </span>
                      )}
                      {app.status === "En attente" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="size-3" /> En attente
                        </span>
                      )}
                      {app.status === "En examen" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <Clock className="size-3" /> En examen
                        </span>
                      )}
                      {app.status === "Liste d'attente" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Liste d'attente
                        </span>
                      )}
                      {app.status === "Refusé" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <XCircle className="size-3" /> Refusé
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString("fr-FR") : "N/A"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReview(app)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1"
                        >
                          <Eye className="size-3.5" />
                          Examiner
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: SHARE & QR CODE ─────────────────────────────────────────── */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 text-left">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Portail Public d'Admission</h3>
                <p className="text-xs text-slate-500">Diffusez ce lien ou affichez le QR Code dans l'école</p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
              <div className="bg-white p-4 rounded-2xl shadow-md">
                <QRCodeSVG value={publicUrl} size={180} level="H" />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Scanner pour s'inscrire en ligne
              </span>
            </div>

            {/* Link Box */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="bg-transparent text-xs font-mono text-slate-700 dark:text-slate-200 w-full outline-none px-2"
              />
              <button
                onClick={copyPublicLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 transition"
              >
                Copier
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Inscriptions Ouvertes ! Vous pouvez inscrire votre enfant en ligne dès maintenant via ce lien : ${publicUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <MessageSquare className="size-4" />
                Partager WhatsApp
              </a>

              <button
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="size-4" />
                Imprimer l'Affiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EXAMINER & DÉLIBÉRER ─────────────────────────────────────── */}
      {isReviewModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase">
                  Dossier : {selectedApp.applicationNumber}
                </span>
                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                  {selectedApp.studentLastName?.toUpperCase()} {selectedApp.studentFirstName}
                </h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Candidate Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">Date de naissance :</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedApp.dateOfBirth}</div>
                </div>
                <div>
                  <span className="text-slate-400">Classe demandée :</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{selectedApp.targetClass}</div>
                </div>
                <div>
                  <span className="text-slate-400">Parent / Contact :</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedApp.parentName} ({selectedApp.parentPhone})
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">École précédente :</span>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedApp.previousSchool || "Non renseigné"}
                  </div>
                </div>
              </div>

              {selectedApp.medicalNotes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold">Notes médicales : </span>
                  <span className="text-rose-600 font-medium">{selectedApp.medicalNotes}</span>
                </div>
              )}
            </div>

            {/* Class Assignment */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Classe Officielle à Attribuer :
              </label>
              <select
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Review Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Avis de la Commission / Remarques :
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Ex: Dossier validé. Frais d'inscription à régler sous 15 jours..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => handleDecision("Admis / Accepté")}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSubmittingReview ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Valider l'Admission & Générer le Matricule Officiel 🎉
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleDecision("Liste d'attente")}
                  className="py-2.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 transition"
                >
                  ⏳ Mettre en Liste d'Attente
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleDecision("Refusé")}
                  className="py-2.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-800 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200 dark:border-rose-800 transition"
                >
                  ❌ Rejeter le Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: NOUVELLE INSCRIPTION DIRECTE ────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="size-5 text-emerald-600" />
                Nouvelle Inscription Directe
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDirectApp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MAHAMAN"
                    value={newApp.studentLastName}
                    onChange={(e) => setNewApp({ ...newApp, studentLastName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Prénom(s) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ibrahim"
                    value={newApp.studentFirstName}
                    onChange={(e) => setNewApp({ ...newApp, studentFirstName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date de naissance *</label>
                  <input
                    type="date"
                    required
                    value={newApp.dateOfBirth}
                    onChange={(e) => setNewApp({ ...newApp, dateOfBirth: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Genre</label>
                  <select
                    value={newApp.gender}
                    onChange={(e) => setNewApp({ ...newApp, gender: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Classe demandée *</label>
                  <select
                    value={newApp.targetClass}
                    onChange={(e) => setNewApp({ ...newApp, targetClass: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-600 outline-none"
                  >
                    {CLASSES_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nom du Parent *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: M. Oumarou"
                    value={newApp.parentName}
                    onChange={(e) => setNewApp({ ...newApp, parentName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Téléphone Parent (SMS) *</label>
                  <input
                    type="text"
                    required
                    placeholder="+227 90 00 00 00"
                    value={newApp.parentPhone}
                    onChange={(e) => setNewApp({ ...newApp, parentPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">École de provenance</label>
                <input
                  type="text"
                  placeholder="Ex: Complexe Scolaire Les Étoiles"
                  value={newApp.previousSchool}
                  onChange={(e) => setNewApp({ ...newApp, previousSchool: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
                >
                  {isSubmittingNew && <Loader2 className="size-3.5 animate-spin mr-1 inline" />}
                  Enregistrer la candidature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
