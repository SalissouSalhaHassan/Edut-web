export const dynamic = "force-dynamic";

import { getDocumentHeaderConfig, getSettings, getBranches, updateSchoolDomain } from "@/domains/settings/actions/settings.actions";
import { getCurrentSchool } from "@/domains/auth/services/school";
import { 
  getSessions, getClasses, getSections, getSubjects, getSectionSubjects, 
  getClassSubjects, getGradingAppreciations, getSchoolRemarks, getPeriods, getEducationalLevels, getCanevasReferenceLists
} from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { Settings, Shield, CreditCard, BookOpen, Database, Bell, Globe, School, Building2, DollarSign, Lock, Server, AlertCircle, LayoutGrid, Calendar, MapPin, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { SettingsForm } from "./components/SettingsForm";
import { AcademicSettings } from "./components/AcademicSettings";
import { CurriculumMatrix } from "./components/CurriculumMatrix";
import TimetableManager from "./components/TimetableManager";
import { CampusSetup } from "./components/CampusSetup";
import DocumentHeaderManager from "@/domains/settings/components/DocumentHeaderManager";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: activeTab = 'general' } = await searchParams;
  const settingsRes = await getSettings() as any;
  const allSettings = settingsRes.data?.data || settingsRes.data || [];
  const branchesRes = await getBranches() as any;
  const branches = branchesRes.data?.data || branchesRes.data || [];
  const sessionsRes = await getSessions() as any;
  const sessions = sessionsRes.data?.data || sessionsRes.data || [];
  const classesRes = await getClasses(true) as any;
  const classes = classesRes.data?.data || classesRes.data || [];
  const sectionsRes = await getSections(true) as any;
  const sections = sectionsRes.data?.data || sectionsRes.data || [];
  const subjectsRes = await getSubjects() as any;
  const subjects = subjectsRes.data?.data || subjectsRes.data || [];
  const sectionSubjectsRes = await getSectionSubjects() as any;
  const sectionSubjects = sectionSubjectsRes.data?.data || sectionSubjectsRes.data || [];
  const classSubjectsRes = await getClassSubjects() as any;
  const classSubjects = classSubjectsRes.data?.data || classSubjectsRes.data || [];
  const gradingAppreciationsRes = await getGradingAppreciations() as any;
  const gradingAppreciations = gradingAppreciationsRes.data?.data || gradingAppreciationsRes.data || [];
  const schoolRemarksRes = await getSchoolRemarks() as any;
  const schoolRemarks = schoolRemarksRes.data?.data || schoolRemarksRes.data || [];
  const periodsRes = await getPeriods() as any;
  const periods = periodsRes.data?.data || periodsRes.data || [];
  const levelsRes = await getEducationalLevels(true) as any;
  const educationalLevels = levelsRes.data?.data || levelsRes.data || [];
  const canevasReferencesRes = await getCanevasReferenceLists() as any;
  const canevasReferences = canevasReferencesRes.data?.data || canevasReferencesRes.data || { type: [], cycle: [], commune: [] };
  const employeesRes = await getEmployees() as any;
  const employees = employeesRes.data?.data || employeesRes.data || [];
  const currentUser = await getCurrentUser();
  const currentSchool = await getCurrentSchool();
  const headerConfigRes = await getDocumentHeaderConfig() as any;
  const documentHeaderConfig = headerConfigRes.data?.data || headerConfigRes.data || null;

  const canEditAcademics = currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName?.toLowerCase() === "academics" && p.canEdit);

  const getVal = (key: string) => allSettings.find((s: any) => s.key === key)?.value || "";
  const currentSession = sessions.find((s: any) => s.isActive) || sessions[0];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <SettingsForm>
        <Tabs defaultValue={activeTab} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-3">
             <TabsList className="flex flex-col h-fit bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm gap-2">
                {[
                  { v: 'general', l: 'Général', i: <School size={18} /> },
                  { v: 'finance', l: 'Finances', i: <CreditCard size={18} /> },
                  { v: 'academic', l: 'Académique', i: <BookOpen size={18} /> },
                  { v: 'curriculum', l: 'Matières de Base', i: <LayoutGrid size={18} /> },
                  { v: 'security', l: 'Sécurité', i: <Shield size={18} /> },
                  { v: 'notifications', l: 'Alertes', i: <Bell size={18} /> },
                  { v: 'system', l: 'Système', i: <Database size={18} /> },
                  { v: 'headers', l: 'En-têtes', i: <FileText size={18} /> },
                ].map((t) => (
                  <TabsTrigger 
                    key={t.v} 
                    value={t.v} 
                    className="w-full justify-start rounded-2xl h-14 px-6 font-black text-[10px] uppercase tracking-widest gap-4 data-[state=active]:bg-primary/5 data-[state=active]:text-primary transition-all border border-transparent data-[state=active]:border-primary/10"
                  >
                     {t.i} {t.l}
                  </TabsTrigger>
                ))}
             </TabsList>
          </div>

          <div className="lg:col-span-9">
             <TabsContent value="general" className="m-0 space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                         <Building2 size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Informations de l'Établissement</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nom de l'École</label>
                         <Input name="school_name" defaultValue={getVal('school_name') || "Edut Pro School"} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 focus:bg-white transition-all font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Slogan / Devise</label>
                         <Input name="school_slogan" defaultValue={getVal('school_slogan')} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 focus:bg-white transition-all font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Adresse</label>
                         <Input name="school_address" defaultValue={getVal('school_address')} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 focus:bg-white transition-all font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email de Contact</label>
                         <Input name="school_email" defaultValue={getVal('school_email')} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 focus:bg-white transition-all font-bold" />
                      </div>
                   </div>

                   {/* SaaS Multi-Tenancy Section */}
                   <div className="pt-10 border-t border-slate-100 space-y-8">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Globe size={20} />
                         </div>
                         <h4 className="text-xl font-black text-slate-900 tracking-tight">Configuration du Domaine</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sous-domaine Edut</label>
                            <div className="flex items-center gap-2">
                               <Input readOnly disabled value={`${currentSchool?.slug || 'school'}.edut.pro`} className="h-14 rounded-2xl border-slate-100 bg-slate-100 font-bold text-slate-500 cursor-not-allowed" />
                            </div>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Domaine Personnalisé (Premium)</label>
                            <Input 
                               name="custom_domain" 
                               placeholder="ex: portal.school.edu"
                               defaultValue={currentSchool?.customDomain || ""} 
                               className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 focus:bg-white transition-all font-bold" 
                            />
                            <p className="text-[10px] text-slate-400 font-medium px-2">Pointez votre enregistrement CNAME vers <span className="text-blue-600 font-bold">domains.edut.pro</span></p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                         <Globe size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Paramètres Régionaux</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Langue par défaut</label>
                         <select name="language" defaultValue={getVal('language') || "fr"} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="fr">Français (Sénégal)</option>
                            <option value="ar">العربية (السودان)</option>
                            <option value="en">English (UK)</option>
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fuseau Horaire</label>
                         <select name="timezone" defaultValue={getVal('timezone') || "gmt"} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="gmt">(GMT+00:00) Dakar</option>
                            <option value="gmt2">(GMT+02:00) Khartoum</option>
                         </select>
                      </div>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="finance" className="m-0 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                         <DollarSign size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Finance & Comptabilité</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Devise</label>
                         <Input name="currency" defaultValue={getVal('currency') || "F CFA"} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Préfixe Reçus</label>
                         <Input name="receipt_prefix" defaultValue={getVal('receipt_prefix') || "REC-"} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 font-bold" />
                      </div>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="academic" className="m-0 animate-in slide-in-from-right-4 duration-500">
                <AcademicSettings 
                   initialSessions={sessions}
                   initialPeriods={periods}
                   initialEducationalLevels={educationalLevels}
                   initialCanevasReferences={canevasReferences}
                   initialClasses={classes}
                   initialSections={sections}
                   initialSubjects={subjects}
                   initialSectionSubjects={sectionSubjects}
                   initialClassSubjects={classSubjects}
                   initialGradingAppreciations={gradingAppreciations}
                   initialSchoolRemarks={schoolRemarks}
                   canEdit={canEditAcademics}
                />
             </TabsContent>

             <TabsContent value="curriculum" className="m-0 animate-in slide-in-from-right-4 duration-500">
                <CurriculumMatrix 
                   initialSections={sections}
                   initialSubjects={subjects}
                />
             </TabsContent>


             <TabsContent value="headers" className="m-0 animate-in slide-in-from-right-4 duration-500">
                <DocumentHeaderManager initialConfig={documentHeaderConfig} />
             </TabsContent>

             <TabsContent value="security" className="m-0 animate-in slide-in-from-right-4 duration-500 space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                         <Lock size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sécurité & Accès</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Délai Expiration Session (min)</label>
                         <Input name="session_timeout" type="number" defaultValue={getVal('session_timeout') || "120"} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Politique de Mots de Passe</label>
                         <select name="password_policy" defaultValue={getVal('password_policy') || "strict"} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-4 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20">
                            <option value="strict">Stricte (Majuscules, Chiffres, Symboles)</option>
                            <option value="medium">Moyenne (8 caractères minimum)</option>
                         </select>
                      </div>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="notifications" className="m-0 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                         <Bell size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Alertes & Communications</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nom de l'Expéditeur SMS</label>
                         <Input name="sms_sender_id" defaultValue={getVal('sms_sender_id') || "EDUT PRO"} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 font-bold" />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Clé API SMS</label>
                         <Input name="sms_api_key" type="password" defaultValue={getVal('sms_api_key')} className="h-14 rounded-2xl border-slate-100 shadow-sm bg-slate-50 font-bold" placeholder="••••••••••••••••" />
                      </div>
                   </div>
                </div>
             </TabsContent>

             <TabsContent value="system" className="m-0 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                         <Server size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Système & Avancé</h3>
                   </div>

                   <div className="grid grid-cols-1 gap-8">
                      <div className="p-6 rounded-2xl border border-red-100 bg-red-50 flex items-start gap-4">
                         <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                         <div>
                            <h4 className="font-bold text-red-900">Mode Maintenance</h4>
                            <p className="text-sm text-red-700/80 mt-1 mb-4">Activer ce mode bloque l'accès à tous les utilisateurs sauf les administrateurs.</p>
                            <select name="maintenance_mode" defaultValue={getVal('maintenance_mode') || "false"} className="w-full md:w-auto h-12 bg-white border-red-200 rounded-xl px-4 font-bold text-red-900 shadow-sm outline-none focus:ring-2 focus:ring-red-500/20">
                               <option value="false">Désactivé (Opérationnel)</option>
                               <option value="true">Activé (Maintenance en cours)</option>
                            </select>
                         </div>
                      </div>
                   </div>
                </div>
             </TabsContent>

          </div>
        </Tabs>
      </SettingsForm>
    </div>
  );
}
