"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText, Printer, Save, Settings2, Upload } from "lucide-react";
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

import TemplateDesigner from "@/domains/settings/components/designer/TemplateDesigner";
import { LayoutGrid, Sparkles } from "lucide-react";

const HEADER_STYLES: { value: DocumentHeaderStyle; label: string; description: string }[] = [
  { value: "classic_dual_logo", label: "Classique deux logos", description: "Lycée, collège, primaire, rapports officiels." },
  { value: "bilingual_center_logo", label: "Bilingue centre logo", description: "Français / arabe avec logo central." },
  { value: "university_formal", label: "Université formelle", description: "Facultés, scolarité, arrêtés et autorisations." },
  { value: "modern_card", label: "Carte moderne", description: "Cartes, badges, reçus modernes." },
  { value: "minimal_administrative", label: "Administratif minimal", description: "Listes, rapports internes, attestations simples." },
];

const fieldClass = "h-11 rounded-xl border-slate-200 bg-white text-sm font-bold";

export default function DocumentHeaderManager({ initialConfig }: { initialConfig?: Partial<DocumentHeaderConfig> | null }) {
  const [activeTab, setActiveTab] = useState<"designer" | "preset">("designer");
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
        toast.success("تم حفظ ترويسة الوثائق بنجاح");
      } else {
        toast.error((res as any)?.error || "Impossible d'enregistrer l'en-tête");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Selector Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-slate-900">Éditeur de Modèles Professionnel (WYSIWYG)</h3>
            <p className="text-xs font-semibold text-slate-500">تصميم وتخصيص الترويسات والقوالب الرسمية بحرية كاملة باللسحب والإفلات.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab("designer")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 ${
              activeTab === "designer" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <LayoutGrid size={16} /> المحرر التفاعلي (Canva Designer)
          </button>
          <button
            onClick={() => setActiveTab("preset")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 ${
              activeTab === "preset" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Settings2 size={16} /> التكوين السريع (Presets)
          </button>
        </div>
      </div>

      {/* Main Mode Renderer */}
      {activeTab === "designer" ? (
        <TemplateDesigner />
      ) : (
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
              
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Logos & Armoiries Officiels</p>
                <LogoUploaderField label="Logo gauche (Établissement)" value={config.leftLogo || ""} onChange={(v) => update("leftLogo", v)} />
                <LogoUploaderField label="Logo centre (Sceau / République)" value={config.centerLogo || ""} onChange={(v) => update("centerLogo", v)} />
                <LogoUploaderField label="Logo droite (Ministère / Armoiries)" value={config.rightLogo || ""} onChange={(v) => update("rightLogo", v)} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
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
      )}
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

function LogoUploaderField({ label, value, onChange }: { label: string; value: string; onChange: (base64: string) => void }) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error("La taille du logo ne doit pas dépasser 3 Mo");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onChange(base64);
        toast.success("Logo chargé avec succès");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain p-1" />
          ) : (
            <span className="text-[10px] font-black text-slate-300 uppercase">Logo</span>
          )}
        </div>

        <div className="flex-1 space-y-1.5 min-w-0">
          <Input 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder="URL du logo ou Data Base64..." 
            className="h-9 text-xs font-semibold"
          />
          <div className="flex items-center gap-2">
            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 text-[11px] font-black cursor-pointer transition">
              <Upload size={13} /> Charger image
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex h-8 items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 text-[11px] font-bold transition"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
