"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  getAdmissionsDashboardStats,
  getAdmissionApplicationsList,
  submitAdmissionApplicationAction,
  reviewAdmissionApplicationAction,
  deleteAdmissionApplicationAction,
} from "@/domains/admissions/actions/admissions.actions";

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

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [assignedClass, setAssignedClass] = useState("");

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
      const [statsRes, listRes] = await Promise.all([
        getAdmissionsDashboardStats(),
        getAdmissionApplicationsList({
          status: statusFilter,
          targetClass: classFilter,
          query: searchQuery,
        }),
      ]);

      if (statsRes) setStats((statsRes as any)?.data || statsRes);
      const apps = (listRes as any)?.data?.applications || (listRes as any)?.applications || [];
      setApplications(apps);
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

  const CLASSES_LIST = [
    "CI", "CP", "CE1", "CE2", "CM1", "CM2",
    "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B", "3ème A", "3ème B",
    "2nde C", "2nde A", "1ère D", "1ère A", "Terminale D", "Terminale A", "Terminale C"
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <UserPlus className="size-3.5" /> Portail Admissions & Inscriptions
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Admissions & Nouvelles Inscriptions 📝
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-2xl font-medium">
            Gestion centralisée des candidatures en ligne, examen des pièces justificatives, attribution automatique du Matricule et notification instantanée aux parents.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg transition-all transform active:scale-95"
          >
            <Plus className="size-4" /> Nouveau Dossier
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
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
            <h3 className="text-2xl font-black text-amber-600 mt-0.5">{stats.pendingReview}</h3>
            <p className="text-xs text-slate-400">À examiner par la commission</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admis & Matriculés</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{stats.admitted}</h3>
            <p className="text-xs text-slate-400">Inscrits officiellement</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-2xl">
            <XCircle className="size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refusés / Non retenus</p>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.rejected}</h3>
            <p className="text-xs text-slate-400">Dossiers rejetés</p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par élève, parent, matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-semibold"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="En examen">En examen</option>
            <option value="Admis / Accepté">Admis / Accepté</option>
            <option value="Liste d'attente">Liste d'attente</option>
            <option value="Refusé">Refusé</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-semibold"
          >
            <option value="ALL">Toutes les classes</option>
            {CLASSES_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium">Chargement des dossiers d'admission...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <UserPlus className="size-12 text-slate-300" />
            <p className="text-sm font-semibold">Aucun dossier de candidature trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Dossier</th>
                  <th className="p-4">Candidat (Élève)</th>
                  <th className="p-4">Classe Demandée</th>
                  <th className="p-4">Parent & Contact</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Matricule Attribué</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">{app.applicationNumber}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {app.studentLastName.toUpperCase()} {app.studentFirstName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Né(e) le {app.dateOfBirth} ({app.gender}) • {app.nationality}
                      </p>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs">
                        {app.targetClass}
                      </span>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{app.parentName}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="size-3 text-emerald-600" /> {app.parentPhone}
                      </p>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          app.status === "Admis / Accepté"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60"
                            : app.status === "En attente"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60"
                            : app.status === "Refusé"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800"
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {app.generatedMatricule ? (
                        <span className="font-black text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          {app.generatedMatricule}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Non attribué</span>
                      )}
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenReview(app)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs flex items-center gap-1 transition"
                        >
                          <Eye className="size-3.5" /> Examiner
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EXAMEN DU DOSSIER DE CANDIDATURE */}
      {isReviewModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <UserPlus className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Examen du Dossier : {selectedApp.applicationNumber}
                  </h3>
                  <p className="text-xs text-slate-500">Commission d'admission & inscription scolaire</p>
                </div>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            {/* Candidate Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div>
                <p className="font-semibold text-slate-400 uppercase text-[10px]">Candidat</p>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedApp.studentLastName.toUpperCase()} {selectedApp.studentFirstName}
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  Né(e) le : {selectedApp.dateOfBirth} à {selectedApp.placeOfBirth || "Niamey"}
                </p>
                <p className="text-slate-600 dark:text-slate-300">Genre : {selectedApp.gender} • Nationalité : {selectedApp.nationality}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-400 uppercase text-[10px]">Parent / Responsable</p>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedApp.parentName} ({selectedApp.parentRelation})
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 font-bold">
                  <Phone className="size-3 text-emerald-600" /> {selectedApp.parentPhone}
                </p>
                <p className="text-slate-600 dark:text-slate-300">Adresse : {selectedApp.address || "Non spécifiée"}, {selectedApp.city}</p>
              </div>
            </div>

            {/* School background & Health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">Parcours Scolaire Antérieur :</p>
                <p className="text-slate-600">École de provenance : {selectedApp.previousSchool || "Non renseignée"}</p>
                <p className="text-slate-600">Moyenne précédente : {selectedApp.previousGradeAvg || "N/A"}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">Observations Médicales :</p>
                <p className="text-slate-600">{selectedApp.medicalNotes || "Aucune allergie ou pathologie déclarée."}</p>
              </div>
            </div>

            {/* Assigned Class Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Classe d'affectation définitive :
              </label>
              <select
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-indigo-600 outline-none"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Review Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Avis de la commission / Remarques :
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Notes de délibération..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none"
              />
            </div>

            {/* Decision Buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={() => handleDecision("Admis / Accepté")}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition transform active:scale-98"
              >
                {isSubmittingReview ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Valider l'Admission & Générer le Matricule Officiel 🎉
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleDecision("Liste d'attente")}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200"
                >
                  ⏳ Mettre en liste d'attente
                </button>

                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleDecision("Refusé")}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200"
                >
                  ❌ Rejeter la candidature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOUVELLE CANDIDATURE DIRECTE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="size-5 text-emerald-600" /> Nouvelle Inscription
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400">✕</button>
            </div>

            <form onSubmit={handleCreateDirectApp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={newApp.studentLastName}
                    onChange={(e) => setNewApp({ ...newApp, studentLastName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                    placeholder="Ex: MAHAMAN"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Prénom(s) *</label>
                  <input
                    type="text"
                    required
                    value={newApp.studentFirstName}
                    onChange={(e) => setNewApp({ ...newApp, studentFirstName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                    placeholder="Ex: Ibrahim"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date de naissance *</label>
                  <input
                    type="date"
                    required
                    value={newApp.dateOfBirth}
                    onChange={(e) => setNewApp({ ...newApp, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Genre</label>
                  <select
                    value={newApp.gender}
                    onChange={(e) => setNewApp({ ...newApp, gender: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Classe visée *</label>
                  <select
                    value={newApp.targetClass}
                    onChange={(e) => setNewApp({ ...newApp, targetClass: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-indigo-600"
                  >
                    {CLASSES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nom du Parent *</label>
                  <input
                    type="text"
                    required
                    value={newApp.parentName}
                    onChange={(e) => setNewApp({ ...newApp, parentName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                    placeholder="Ex: M. Oumarou"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Téléphone Parent *</label>
                  <input
                    type="text"
                    required
                    value={newApp.parentPhone}
                    onChange={(e) => setNewApp({ ...newApp, parentPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                    placeholder="+227 90 00 00 00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">École de provenance</label>
                <input
                  type="text"
                  value={newApp.previousSchool}
                  onChange={(e) => setNewApp({ ...newApp, previousSchool: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  placeholder="Ex: Complexe Scolaire Privé Les Étoiles"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Remarques médicales ou allergies</label>
                <input
                  type="text"
                  value={newApp.medicalNotes}
                  onChange={(e) => setNewApp({ ...newApp, medicalNotes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  placeholder="Ex: Asthme léger, Allergie arachides..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Annuler</button>
                <button type="submit" disabled={isSubmittingNew} className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow">
                  {isSubmittingNew && <Loader2 className="size-3.5 animate-spin mr-1" />}
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
