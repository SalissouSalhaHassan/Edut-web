"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Printer, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import {
  defaultDocumentHeaderConfig,
  mergeDocumentHeaderConfig,
  type DocumentHeaderConfig,
  type DocumentHeaderStyle,
} from "@/domains/printing/document-header";
import { saveDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";

const HEADER_STYLES: { value: DocumentHeaderStyle; label: string; description: string }[] = [
  { value: "classic_dual_logo", label: "Classique deux logos", description: "Lycée, collège, primaire, rapports officiels." },
  { value: "bilingual_center_logo", label: "Bilingue centre logo", description: "Français / arabe avec logo central." },
  { value: "university_formal", label: "Université formelle", description: "Facultés, scolarité, arrêtés et autorisations." },
  { value: "modern_card", label: "Carte moderne", description: "Cartes, badges, reçus modernes." },
  { value: "minimal_administrative", label: "Administratif minimal", description: "Listes, rapports internes, attestations simples." },
];

const fieldClass = "h-11 rounded-xl border-slate-200 bg-white text-sm font-bold";

export default function DocumentHeaderManager({ initialConfig }: { initialConfig?: Partial<DocumentHeaderConfig> | null }) {
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState<DocumentHeaderConfig>(() => mergeDocumentHeaderConfig(initialConfig));
  const previewTitle = useMemo(() => "Exemple de rapport officiel", []);

  const update = (key: keyof DocumentHeaderConfig, value: any) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const reset = () => setConfig(defaultDocumentHeaderConfig);

  const save = () => {
    startTransition(async () => {
      const res = await saveDocumentHeaderConfig(config);
      if (res?.success) {
        toast.success("Tرويسة الوثائق محفوظة بنجاح");
      } else {
        toast.error((res as any)?.error || "Impossible d'enregistrer l'en-tête");
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Settings2 size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Gestion des En-têtes Officiels</h3>
              <p className="text-sm font-semibold text-slate-500">Modèles réutilisables pour rapports, reçus, bulletins, attestations et cartes.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => window.print()} className="rounded-xl font-black">
              <Printer size={16} /> Imprimer test
            </Button>
            <Button type="button" variant="outline" onClick={reset} className="rounded-xl font-black">
              Réinitialiser
            </Button>
            <Button type="button" onClick={save} disabled={isPending} className="rounded-xl bg-indigo-600 font-black text-white">
              <Save size={16} /> {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Style de l'en-tête</p>
              <div className="grid gap-2">
                {HEADER_STYLES.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => update("style", style.value)}
                    className={`rounded-2xl border p-4 text-left transition ${config.style === style.value ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-100 bg-white hover:border-slate-300"}`}
                  >
                    <p className="text-sm font-black">{style.label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{style.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-4">
              <Field label="Nom établissement" value={config.schoolName} onChange={(v) => update("schoolName", v)} />
              <Field label="Nom arabe établissement" value={config.schoolNameAr || ""} onChange={(v) => update("schoolNameAr", v)} />
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="République / Pays" value={config.country || ""} onChange={(v) => update("country", v)} />
                <Field label="République / Pays (Arabe)" value={config.countryAr || ""} onChange={(v) => update("countryAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ministère" value={config.ministry || ""} onChange={(v) => update("ministry", v)} />
                <Field label="Ministère (Arabe)" value={config.ministryAr || ""} onChange={(v) => update("ministryAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Direction régionale" value={config.regionalDirection || ""} onChange={(v) => update("regionalDirection", v)} />
                <Field label="Direction régionale (Arabe)" value={config.regionalDirectionAr || ""} onChange={(v) => update("regionalDirectionAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Direction départementale" value={config.departmentalDirection || ""} onChange={(v) => update("departmentalDirection", v)} />
                <Field label="Direction départementale (Arabe)" value={config.departmentalDirectionAr || ""} onChange={(v) => update("departmentalDirectionAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inspection" value={config.inspection || ""} onChange={(v) => update("inspection", v)} />
                <Field label="Inspection (Arabe)" value={config.inspectionAr || ""} onChange={(v) => update("inspectionAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Service" value={config.service || ""} onChange={(v) => update("service", v)} />
                <Field label="Service (Arabe)" value={config.serviceAr || ""} onChange={(v) => update("serviceAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Adresse" value={config.address || ""} onChange={(v) => update("address", v)} />
                <Field label="Adresse (Arabe)" value={config.addressAr || ""} onChange={(v) => update("addressAr", v)} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="BP" value={config.bp || ""} onChange={(v) => update("bp", v)} />
                <Field label="Téléphone" value={config.phone || ""} onChange={(v) => update("phone", v)} />
              </div>
              <Field label="Email" value={config.email || ""} onChange={(v) => update("email", v)} />
              <Field label="Année scolaire" value={config.schoolYear || ""} onChange={(v) => update("schoolYear", v)} />
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="Devise" value={config.motto || ""} onChange={(v) => update("motto", v)} />
                <Field label="Devise (Arabe)" value={config.mottoAr || ""} onChange={(v) => update("mottoAr", v)} />
              </div>
              
              <Field label="Autorisations / Arrêtés" value={config.authorizationText || ""} onChange={(v) => update("authorizationText", v)} />
              <Field label="Logo gauche URL" value={config.leftLogo || ""} onChange={(v) => update("leftLogo", v)} />
              <Field label="Logo centre URL" value={config.centerLogo || ""} onChange={(v) => update("centerLogo", v)} />
              <Field label="Logo droite URL" value={config.rightLogo || ""} onChange={(v) => update("rightLogo", v)} />
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Couleur principale" value={config.primaryColor || "#4f46e5"} onChange={(v) => update("primaryColor", v)} />
                <ColorField label="Couleur secondaire" value={config.secondaryColor || "#10b981"} onChange={(v) => update("secondaryColor", v)} />
              </div>
            </section>
          </div>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-700">
              <FileText size={18} /> Aperçu A4
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-100 p-4">
              <div className="mx-auto min-h-[720px] max-w-[794px] bg-white p-8 shadow-xl print:min-h-0 print:max-w-none print:shadow-none">
                <OfficialDocumentHeader config={config} title={previewTitle} />
                <div className="mt-10 space-y-4 text-sm font-semibold text-slate-700">
                  <p>Cette zone représente le contenu du rapport, de l'attestation, du reçu ou du relevé.</p>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                        <tr><th className="p-3">N°</th><th className="p-3">Libellé</th><th className="p-3">Valeur</th><th className="p-3">Observation</th></tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((n) => <tr key={n} className="border-t"><td className="p-3">{n}</td><td className="p-3">Exemple</td><td className="p-3">Donnée</td><td className="p-3">Validé</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-16 flex justify-between text-center text-xs font-black">
                    <span>Signature Directeur</span>
                    <span>Cachet</span>
                    <span>Signature Inspection</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-8 border-none bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm font-bold outline-none" />
      </div>
    </label>
  );
}
