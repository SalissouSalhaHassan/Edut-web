"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogPortal } from "@/components/ui/dialog";
import { createEmployee, updateEmployee } from "@/domains/hr/actions/employees.actions";
import { EmployeeFormData } from "../validators/employee.schema";
import { useSpeech } from "@/hooks/use-speech";
import { X, User, Phone, Briefcase, Landmark, Loader2 } from "lucide-react";

interface EmployeeDialogProps {
  mode?: "add" | "edit";
  initialData?: any;
  trigger?: React.ReactNode;
}

// ─── Reusable Field Components ─────────────────────────────────────────────
function FieldGroup({ label, children, span }: { label: string; children: React.ReactNode; span?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${span ?? ""}`}>
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const selectCls =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all cursor-pointer focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 appearance-none";

// ─── Section Header ────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-3 pb-4 border-b border-slate-100`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color} shadow-sm`}>
        {icon}
      </span>
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-600">{label}</h3>
    </div>
  );
}

export default function EmployeeDialog({ mode = "add", initialData, trigger }: EmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { speak } = useSpeech();

  useEffect(() => {
    if (open) {
      if (mode === "add") {
        speak("Nouvel employé. Veuillez remplir le formulaire.", "fr-FR");
      } else {
        speak("Modification de l'employé.", "fr-FR");
      }
    }
  }, [open, mode, speak]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const parseSalaire = () => {
      const v = form.get("salaireBase");
      if (v === "" || v === null || v === undefined) return 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    const data: EmployeeFormData = {
      empId: form.get("empId") as string,
      nom: form.get("nom") as string,
      poste: (form.get("poste") as string) || undefined,
      departement: (form.get("departement") as string) || undefined,
      mobile: (form.get("mobile") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      dateEmbauche: (form.get("dateEmbauche") as string) || undefined,
      salaireBase: parseSalaire(),
      sexe: ((form.get("sexe") as string) || undefined) as "Homme" | "Femme" | undefined,
      dateNaissance: (form.get("dateNaissance") as string) || undefined,
      cnic: (form.get("cnic") as string) || undefined,
      adresse: (form.get("adresse") as string) || undefined,
      banqueNom: (form.get("banqueNom") as string) || undefined,
      banqueCompte: (form.get("banqueCompte") as string) || undefined,
      statut: (form.get("statut") as string) || "Actif",
      educationalLevel: (form.get("educationalLevel") as string) || undefined,
    };

    let result;
    if (mode === "edit" && initialData?.id) {
      result = await updateEmployee(initialData.id, data);
    } else {
      result = await createEmployee(data);
    }

    setLoading(false);

    if (result.success) {
      setOpen(false);
    } else if (result.error) {
      setError(result.error);
    }
  }

  return (
    <>
      {/* ── Trigger ── */}
      <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        {trigger || (
          <button className="rounded-2xl px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 shadow-lg transition-all font-bold text-sm flex items-center gap-2">
            <User size={15} />
            Ajouter un employé
          </button>
        )}
      </div>

      {/* ── Portal ── */}
      <DialogPortal>
        {open && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-[3px] animate-in fade-in duration-200"
            />

            {/* Modal shell — intentionally NOT using DialogContent to bypass shadcn width cap */}
            <div
              role="dialog"
              aria-modal="true"
              className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2
                         w-[96vw] max-w-[1100px] max-h-[92vh]
                         flex flex-col
                         rounded-3xl bg-white shadow-[0_32px_80px_-12px_rgba(0,0,0,0.22)]
                         animate-in zoom-in-95 slide-in-from-bottom-4 duration-300
                         overflow-hidden"
            >
              {/* ── Sticky Header ── */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-4">
                  {/* Accent bar */}
                  <span className="h-10 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-0.5">
                      Ressources Humaines
                    </p>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {mode === "edit" ? "Modifier l'Employé" : "Nouvel Employé"}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto px-8 py-7 space-y-8">
                <form id="employee-form" onSubmit={handleSubmit}>

                  {/* Error */}
                  {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2">
                      <span className="text-rose-500">⚠️</span> {error}
                    </div>
                  )}

                  {/* ════ SECTION 1 — IDENTITÉ ════ */}
                  <section className="space-y-5">
                    <SectionHeader
                      icon={<User size={16} className="text-indigo-600" />}
                      label="Identité"
                      color="bg-indigo-50"
                    />
                    {/* Row 1: 3 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <FieldGroup label="ID Employé *">
                        <Input
                          name="empId"
                          defaultValue={initialData?.empId}
                          required
                          placeholder="EMP-001"
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Nom complet *">
                        <Input
                          name="nom"
                          defaultValue={initialData?.nom}
                          required
                          placeholder="Prénom NOM"
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Sexe">
                        <select
                          name="sexe"
                          defaultValue={initialData?.sexe ?? ""}
                          className={selectCls}
                        >
                          <option value="">— Sélectionner —</option>
                          <option value="Homme">Homme</option>
                          <option value="Femme">Femme</option>
                        </select>
                      </FieldGroup>
                    </div>

                    {/* Row 2: 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FieldGroup label="Date de naissance">
                        <Input
                          type="date"
                          name="dateNaissance"
                          defaultValue={initialData?.dateNaissance ?? ""}
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Numéro de Carte d'Identité (CNIC)">
                        <Input
                          name="cnic"
                          defaultValue={initialData?.cnic ?? ""}
                          placeholder="N° national / passeport"
                          className={inputCls}
                        />
                      </FieldGroup>
                    </div>
                  </section>

                  {/* ════ SECTION 2 — CONTACT & ADRESSE ════ */}
                  <section className="space-y-5">
                    <SectionHeader
                      icon={<Phone size={16} className="text-emerald-600" />}
                      label="Contact & Adresse"
                      color="bg-emerald-50"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FieldGroup label="Téléphone Mobile">
                        <Input
                          name="mobile"
                          defaultValue={initialData?.mobile ?? ""}
                          placeholder="+227 90 00 00 00"
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Adresse E-mail">
                        <Input
                          type="email"
                          name="email"
                          defaultValue={initialData?.email ?? ""}
                          placeholder="exemple@ecole.ne"
                          className={inputCls}
                        />
                      </FieldGroup>
                    </div>

                    <FieldGroup label="Adresse Physique">
                      <Textarea
                        name="adresse"
                        defaultValue={initialData?.adresse ?? ""}
                        placeholder="Quartier, ville, pays..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                      />
                    </FieldGroup>
                  </section>

                  {/* ════ SECTION 3 — POSTE & CONTRAT ════ */}
                  <section className="space-y-5">
                    <SectionHeader
                      icon={<Briefcase size={16} className="text-amber-600" />}
                      label="Poste & Contrat"
                      color="bg-amber-50"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <FieldGroup label="Poste / Fonction">
                        <Input
                          name="poste"
                          defaultValue={initialData?.poste ?? ""}
                          placeholder="Directeur, Professeur..."
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Département">
                        <Input
                          name="departement"
                          defaultValue={initialData?.departement ?? ""}
                          placeholder="Pédagogie, Admin..."
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Date d'embauche">
                        <Input
                          type="date"
                          name="dateEmbauche"
                          defaultValue={initialData?.dateEmbauche ?? ""}
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Niveau Éducatif / Secteur">
                        <select
                          name="educationalLevel"
                          defaultValue={initialData?.educationalLevel ?? "Tous"}
                          className={selectCls}
                        >
                          <option value="Tous">Tous les niveaux</option>
                          <option value="Maternelle">🌱 Maternelle</option>
                          <option value="Primaire">📚 Primaire</option>
                          <option value="Collège">🏫 Collège</option>
                          <option value="Lycée">🎓 Lycée</option>
                          <option value="Supérieur">🎓 Supérieur</option>
                        </select>
                      </FieldGroup>

                      <FieldGroup label="Statut du contrat" span="sm:col-span-2">
                        <div className="flex gap-3">
                          {["Actif", "Inactif", "En Attente"].map((s) => (
                            <label
                              key={s}
                              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 has-[:checked]:shadow-sm"
                            >
                              <input
                                type="radio"
                                name="statut"
                                value={s}
                                defaultChecked={(initialData?.statut ?? "Actif") === s}
                                className="sr-only"
                              />
                              <span className="text-base">
                                {s === "Actif" ? "✅" : s === "Inactif" ? "❌" : "⏳"}
                              </span>
                              {s}
                            </label>
                          ))}
                        </div>
                      </FieldGroup>
                    </div>
                  </section>

                  {/* ════ SECTION 4 — FINANCES & BANQUE ════ */}
                  <section className="space-y-5">
                    <SectionHeader
                      icon={<Landmark size={16} className="text-violet-600" />}
                      label="Finances & Banque"
                      color="bg-violet-50"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <FieldGroup label="Salaire de Base (FCFA)">
                        <Input
                          type="number"
                          name="salaireBase"
                          min={0}
                          step={500}
                          defaultValue={initialData?.salaireBase ?? ""}
                          placeholder="0"
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Nom de la Banque">
                        <Input
                          name="banqueNom"
                          defaultValue={initialData?.banqueNom ?? ""}
                          placeholder="BIA, Ecobank..."
                          className={inputCls}
                        />
                      </FieldGroup>

                      <FieldGroup label="Numéro de Compte">
                        <Input
                          name="banqueCompte"
                          defaultValue={initialData?.banqueCompte ?? ""}
                          placeholder="NE XX XXXX XXXX"
                          className={inputCls}
                        />
                      </FieldGroup>
                    </div>
                  </section>

                </form>
              </div>

              {/* ── Sticky Footer ── */}
              <div className="shrink-0 flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/70">
                <p className="text-xs text-slate-400 font-medium">
                  Les champs marqués <span className="text-rose-500 font-bold">*</span> sont obligatoires
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    form="employee-form"
                    disabled={loading}
                    className="h-11 px-8 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Enregistrement...
                      </>
                    ) : mode === "edit" ? (
                      "💾 Mettre à jour"
                    ) : (
                      "✅ Enregistrer"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogPortal>
    </>
  );
}
