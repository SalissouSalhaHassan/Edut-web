"use client";

import * as React from "react";
import { useState, useTransition, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Table,
  FileSpreadsheet,
  Users,
  BookOpen,
  Briefcase,
  Play,
  RotateCcw,
  Sparkles,
  Award
} from "lucide-react";
import { toast } from "sonner";
import {
  importStudentRow,
  importEmployeeRow,
  importSubjectRow,
  importExamResultRow
} from "@/domains/importation/actions/import.actions";
import { cn } from "@/lib/utils";

type ImportType = "student" | "employee" | "subject" | "exam_result";

interface FieldInfo {
  key: string;
  label: string;
  required: boolean;
}

const FIELDS: Record<ImportType, FieldInfo[]> = {
  student: [
    { key: "numAdmission", label: "Matricule (N° Admission) *", required: true },
    { key: "nomEtudiant", label: "Nom complet de l'élève *", required: true },
    { key: "nomArabe", label: "Nom en Arabe", required: false },
    { key: "sexe", label: "Sexe (Garçon/Fille)", required: false },
    { key: "religion", label: "Religion", required: false },
    { key: "dateNaissance", label: "Date de Naissance", required: false },
    { key: "lieuNaissance", label: "Lieu de Naissance", required: false },
    { key: "cnic", label: "NIN / CNIC", required: false },
    { key: "groupeSanguin", label: "Groupe Sanguin", required: false },
    { key: "session", label: "Année Scolaire (Session)", required: false },
    { key: "educationalLevel", label: "Niveau Éducatif (Collège/Lycée...)", required: false },
    { key: "classe", label: "Classe", required: false },
    { key: "section", label: "Section / Filière", required: false },
    { key: "categorie", label: "Catégorie", required: false },
    { key: "nomPere", label: "Nom du Père / Tuteur", required: false },
    { key: "cnicPere", label: "CNIC Père / Tuteur", required: false },
    { key: "mobile", label: "Téléphone", required: false },
    { key: "whatsapp", label: "WhatsApp", required: false },
    { key: "fraisMensuels", label: "Scolarité Mensuelle (CFA)", required: false },
    { key: "ancienSolde", label: "Ancien Solde (CFA)", required: false },
    { key: "fraisInscription", label: "Frais d'Inscription (CFA)", required: false },
    { key: "fraisCogesCard", label: "Frais COGES / Cartes ID (CFA)", required: false },
    { key: "fraisTransportInternat", label: "Transport / Internat (CFA)", required: false },
    { key: "statut", label: "Statut (Actif/Inactif)", required: false },
    { key: "behaviorScore", label: "Note de Conduite (0-20)", required: false }
  ],
  employee: [
    { key: "empId", label: "Identifiant Employé (ID) *", required: true },
    { key: "nom", label: "Nom complet *", required: true },
    { key: "dateNaissance", label: "Date de Naissance", required: false },
    { key: "lieuNaissance", label: "Lieu de Naissance", required: false },
    { key: "sexe", label: "Sexe (Homme/Femme)", required: false },
    { key: "mobile", label: "Téléphone Mobile", required: false },
    { key: "email", label: "Adresse E-mail", required: false },
    { key: "codeGrade", label: "Code Grade", required: false },
    { key: "categorie", label: "Catégorie", required: false },
    { key: "classe", label: "Classe", required: false },
    { key: "echelon", label: "Échelon", required: false },
    { key: "poste", label: "Poste / Fonction", required: false },
    { key: "fonction", label: "Fonction", required: false },
    { key: "dateNomination", label: "Date Nomination au Poste", required: false },
    { key: "lieuAffectation", label: "Lieu d'Affectation", required: false },
    { key: "commune", label: "Commune", required: false },
    { key: "departement", label: "Département", required: false },
    { key: "region", label: "Région", required: false },
    { key: "dateAffectation", label: "Date Affectation", required: false },
    { key: "salaireBase", label: "Salaire de Base (CFA)", required: false },
    { key: "dateEmbauche", label: "Date d'Embauche", required: false },
    { key: "cnic", label: "NIN / CNIC", required: false },
    { key: "adresse", label: "Adresse Résidentielle", required: false },
    { key: "banqueNom", label: "Nom de la Banque", required: false },
    { key: "banqueCompte", label: "Compte Bancaire (RIB)", required: false },
    { key: "statut", label: "Statut (Actif/Inactif)", required: false },
    { key: "educationalLevel", label: "Niveau d'Enseignement", required: false }
  ],
  subject: [
    { key: "subjectName", label: "Nom de la Matière *", required: true },
    { key: "subjectCode", label: "Code Matière", required: false },
    { key: "category", label: "Catégorie (Littéraire/Scientifique)", required: false },
    { key: "sectionName", label: "Section / Filière (ex: Terminale D)", required: false },
    { key: "educationalLevel", label: "Niveau Éducatif (ex: Lycée, Collège)", required: false },
    { key: "coefficient", label: "Coefficient", required: false },
    { key: "credits", label: "Crédits", required: false },
    { key: "term", label: "Semestre / Période (Optionnel)", required: false }
  ],
  exam_result: [
    { key: "examName", label: "Nom de l'Examen *", required: true },
    { key: "className", label: "Nom de la Classe *", required: true },
    { key: "subjectName", label: "Nom de la Matière *", required: true },
    { key: "numAdmission", label: "Matricule de l'Élève *", required: true },
    { key: "marksObtained", label: "Note Obtenue (décimal) *", required: true },
    { key: "periodName", label: "Trimestre / Semestre", required: false },
    { key: "maxMarks", label: "Note Maximale (ex: 20)", required: false },
    { key: "remarks", label: "Appréciation / Remarques", required: false },
    { key: "examDate", label: "Date de l'Examen", required: false }
  ]
};

const KEYWORDS: Record<string, string[]> = {
  numAdmission: ["matricule", "admission", "num", "reg", "id", "matricule_eleve", "numadmission"],
  nomEtudiant: ["nom", "name", "student", "eleve", "etudiant", "nom_complet", "nometudiant"],
  nomArabe: ["arabe", "arabic", "nom_arabe", "nomarabe"],
  sexe: ["sexe", "gender", "genre"],
  religion: ["religion", "foi"],
  dateNaissance: ["naissance", "birth", "dob", "date_naissance", "datenaissance"],
  lieuNaissance: ["lieu", "lieu_naissance", "place", "lieunaissance", "lieu name", "lieu de naissance"],
  cnic: ["cnic", "nin", "carte", "identite"],
  groupeSanguin: ["sanguin", "blood", "groupe_sanguin", "groupesanguin"],
  session: ["session", "annee", "annee_scolaire", "session_scolaire"],
  educationalLevel: ["cycle", "niveau_educatif", "educational_level", "educationallevel", "niveau"],
  classe: ["classe", "class", "niveau_classe"],
  section: ["section", "filiere", "serie"],
  categorie: ["categorie", "category"],
  nomPere: ["pere", "tuteur", "parent", "father", "nompere"],
  cnicPere: ["cnic_pere", "nin_pere", "tuteur_cnic", "cnicpere"],
  mobile: ["mobile", "tel", "phone", "contact", "telephone"],
  whatsapp: ["whatsapp", "wa"],
  fraisMensuels: ["mensuel", "frais_mensuels", "monthly", "mensualite", "fraismensuels"],
  ancienSolde: ["ancien_solde", "solde", "balance", "arriere", "anciensolde"],
  fraisInscription: ["inscription", "frais_inscription", "fraisinscription"],
  fraisCogesCard: ["coges", "frais_coges", "coges_card", "fraiscogescard"],
  fraisTransportInternat: ["transport_internat", "transport", "internat", "fraistransportinternat"],
  statut: ["statut", "status", "etat"],
  behaviorScore: ["conduite", "behavior", "behaviour", "score_conduite", "behaviorscore"],
  
  empId: ["emp_id", "id", "matricule", "identifiant", "empid"],
  nom: ["nom", "name", "employe", "staff", "nom_complet"],
  poste: ["poste", "job", "designation", "fonction"],
  departement: ["dept", "departement", "service", "section"],
  dateEmbauche: ["embauche", "hire", "date_embauche", "dateembauche"],
  salaireBase: ["salaire", "salary", "pay", "base", "salaire_base", "salairebase"],
  adresse: ["adresse", "address"],
  banqueNom: ["banque", "bank", "banque_nom", "banquenom"],
  banqueCompte: ["compte", "account", "banque_compte", "banquecompte"],
  codeGrade: ["code_grade", "codegrade", "code grade"],
  echelon: ["echelon", "echellon"],
  fonction: ["fonction", "function"],
  dateNomination: ["date_nomination", "datenomination", "date nomination"],
  lieuAffectation: ["lieu_affectation", "lieuaffectation", "affectation lieu", "lieu d'affectation"],
  commune: ["commune", "city"],
  region: ["region"],
  dateAffectation: ["date_affectation", "dateaffectation", "date affectation"],

  subjectName: ["matiere", "subject", "cours", "course", "nom_matiere", "subjectname"],
  subjectCode: ["code", "subject_code", "code_matiere", "subjectcode"],
  category: ["categorie", "category", "type"],
  sectionName: ["section_name", "section", "filiere", "sectionname", "nom_section", "serie"],
  coefficient: ["coefficient", "coef", "default_coef", "defaultcoef", "coef_matiere"],
  credits: ["credits", "credit", "nbr_credit"],
  term: ["term", "semestre", "periode", "trimestre"],
  examName: ["examen", "exam", "examname", "nom_examen", "titre_examen"],
  className: ["classe", "class", "classname", "nom_classe"],
  marksObtained: ["note", "marks", "obtained", "marksobtained", "note_obtenue", "note_sur", "resultat", "result"],
  periodName: ["trimestre", "semestre", "periode", "period", "periodname", "nom_periode"],
  maxMarks: ["max", "note_max", "maxmarks", "bareme", "note_maximale"],
  remarks: ["remarques", "appreciation", "remarks", "commentaire", "obs", "observation"],
  examDate: ["date", "date_examen", "examdate"]
};

export default function ImportationPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("student");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  // UI states
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Mapping & Preview, 3: Executing
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, error: 0 });
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Excel template generation and download
  const handleDownloadTemplate = (type: ImportType) => {
    let cols: string[] = [];
    let sample: any[] = [];
    let filename = "";

    if (type === "student") {
      cols = [
        "numAdmission", "nomEtudiant", "nomArabe", "sexe", "religion",
        "dateNaissance", "lieuNaissance", "cnic", "session",
        "educationalLevel", "classe", "section", "nomPere", "mobile",
        "fraisMensuels", "ancienSolde", "fraisInscription"
      ];
      sample = [
        {
          numAdmission: "2026-0001",
          nomEtudiant: "Moussa Konaté",
          nomArabe: "موسى كوناتي",
          sexe: "Garçon",
          religion: "Islam",
          dateNaissance: "12/04/2012",
          lieuNaissance: "Abidjan",
          cnic: "CI00987622",
          session: "2025-2026",
          educationalLevel: "Collège",
          classe: "6ème A",
          section: "Collège Général",
          nomPere: "Drissa Konaté",
          mobile: "+2250708091011",
          fraisMensuels: 12000,
          ancienSolde: 0,
          fraisInscription: 15000
        },
        {
          numAdmission: "2026-0002",
          nomEtudiant: "Fatou Diop",
          nomArabe: "فاتو ديوب",
          sexe: "Fille",
          religion: "Islam",
          dateNaissance: "05/09/2013",
          lieuNaissance: "Bouaké",
          cnic: "CI00123456",
          session: "2025-2026",
          educationalLevel: "Collège",
          classe: "5ème B",
          section: "Collège Général",
          nomPere: "Ibrahim Diop",
          mobile: "+2250506070809",
          fraisMensuels: 12000,
          ancienSolde: 5000,
          fraisInscription: 15000
        }
      ];
      filename = "Modele_Import_Eleves.xlsx";
    } else if (type === "employee") {
      cols = [
        "empId", "nom", "dateNaissance", "lieuNaissance", "sexe", "mobile", "email",
        "codeGrade", "categorie", "classe", "echelon", "poste", "fonction", "dateNomination",
        "lieuAffectation", "commune", "departement", "region", "dateAffectation", "salaireBase"
      ];
      sample = [
        {
          empId: "EMP-2026-01",
          nom: "Adama Coulibaly",
          dateNaissance: "12/04/1985",
          lieuNaissance: "Abidjan",
          sexe: "Homme",
          mobile: "+2250700112233",
          email: "a.coulibaly@ecoleplus.edu",
          codeGrade: "G3",
          categorie: "A",
          classe: "1ère",
          echelon: "E2",
          poste: "Enseignant",
          fonction: "Directeur des Études",
          dateNomination: "01/10/2024",
          lieuAffectation: "Lycée de Cocody",
          commune: "Cocody",
          departement: "Lagunes",
          region: "Lagunes",
          dateAffectation: "01/09/2023",
          salaireBase: 300000
        },
        {
          empId: "EMP-2026-02",
          nom: "Clarisse Touré",
          dateNaissance: "20/08/1990",
          lieuNaissance: "Bouaké",
          sexe: "Femme",
          mobile: "+2250102030405",
          email: "c.toure@ecoleplus.edu",
          codeGrade: "G2",
          categorie: "B",
          classe: "2ème",
          echelon: "E1",
          poste: "Comptable",
          fonction: "Comptable Principale",
          dateNomination: "15/01/2024",
          lieuAffectation: "Lycée de Cocody",
          commune: "Cocody",
          departement: "Lagunes",
          region: "Lagunes",
          dateAffectation: "15/01/2024",
          salaireBase: 350000
        }
      ];
      filename = "Modele_Import_Personnel.xlsx";
    } else if (type === "subject") {
      cols = ["subjectName", "subjectCode", "category"];
      sample = [
        { subjectName: "Physique-Chimie", subjectCode: "PC01", category: "Scientifique" },
        { subjectName: "Histoire-Géographie", subjectCode: "HG01", category: "Littéraire" },
        { subjectName: "Anglais", subjectCode: "ANG01", category: "Langue" }
      ];
      filename = "Modele_Import_Matieres.xlsx";
    } else if (type === "exam_result") {
      cols = ["examName", "className", "subjectName", "numAdmission", "marksObtained", "periodName", "maxMarks", "remarks", "examDate"];
      sample = [
        {
          examName: "Contrôle Continu 1",
          className: "6ème A",
          subjectName: "Physique-Chimie",
          numAdmission: "2026-0001",
          marksObtained: 15.5,
          periodName: "1er Trimestre",
          maxMarks: 20,
          remarks: "Très bon travail",
          examDate: "12/10/2025"
        },
        {
          examName: "Contrôle Continu 1",
          className: "6ème A",
          subjectName: "Physique-Chimie",
          numAdmission: "2026-0002",
          marksObtained: 9.0,
          periodName: "1er Trimestre",
          maxMarks: 20,
          remarks: "Insuffisant",
          examDate: "12/10/2025"
        }
      ];
      filename = "Modele_Import_Notes.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(sample, { header: cols });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, filename);
    toast.success(`Modèle Excel généré : ${filename}`);
  };

  // Read uploaded Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse headers first
        const rawJson = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rawJson.length === 0) {
          toast.error("Le fichier Excel est vide.");
          return;
        }

        const excelHeaders = (rawJson[0] as string[]).map(h => String(h).trim()).filter(Boolean);
        setHeaders(excelHeaders);

        // Convert the rest to JSON rows
        const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
        setParsedData(rows);

        // Apply smart fuzzy mapping
        const systemFields = FIELDS[activeTab].map(f => f.key);
        const initialMapping: Record<string, string> = {};

        for (const field of systemFields) {
          const kws = KEYWORDS[field] || [];
          let matched = "";
          
          // Try exact match
          for (const h of excelHeaders) {
            if (h.toLowerCase().trim() === field.toLowerCase()) {
              matched = h;
              break;
            }
          }

          // Try keyword matching
          if (!matched) {
            for (const kw of kws) {
              for (const h of excelHeaders) {
                if (h.toLowerCase().trim().includes(kw)) {
                  matched = h;
                  break;
                }
              }
              if (matched) break;
            }
          }

          initialMapping[field] = matched || "Ignorer";
        }

        setColumnMapping(initialMapping);
        setStep(2);
        toast.info(`${rows.length} lignes chargées. Veuillez vérifier la correspondance des colonnes.`);
      } catch (err: any) {
        toast.error(`Erreur de lecture du fichier Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;
        // Trigger event
        const changeEvent = new Event("change", { bubbles: true });
        fileInputRef.current.dispatchEvent(changeEvent);
      }
    } else {
      toast.error("Veuillez déposer un fichier Excel valide (.xlsx)");
    }
  };

  // Launch import logic row by row
  const startImport = () => {
    // 1. Verify required column mappings
    const missingRequired: string[] = [];
    FIELDS[activeTab].forEach(field => {
      if (field.required && (!columnMapping[field.key] || columnMapping[field.key] === "Ignorer")) {
        missingRequired.push(field.label);
      }
    });

    if (missingRequired.length > 0) {
      toast.error(`Veuillez mapper les colonnes obligatoires : ${missingRequired.join(", ")}`);
      return;
    }

    setStep(3);
    setImportProgress({ current: 0, total: parsedData.length, success: 0, error: 0 });
    setImportLogs([]);

    startTransition(async () => {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        
        // Assemble mapped payload
        const payload: Record<string, any> = {};
        FIELDS[activeTab].forEach(field => {
          const excelHeader = columnMapping[field.key];
          if (excelHeader && excelHeader !== "Ignorer") {
            payload[field.key] = row[excelHeader];
          }
        });

        // Add index tracker
        const rowNum = i + 2; // header is 1

        try {
          let res: any;
          if (activeTab === "student") {
            res = await importStudentRow(payload);
          } else if (activeTab === "employee") {
            res = await importEmployeeRow(payload);
          } else if (activeTab === "subject") {
            res = await importSubjectRow(payload);
          } else {
            res = await importExamResultRow(payload);
          }

          if (res?.success) {
            successCount++;
            const actionText = res.action === "update" ? "mis à jour" : "créé";
            const rowId = payload.numAdmission || payload.empId || payload.subjectName || `Ligne ${rowNum}`;
            setImportLogs(prev => [
              `✅ Ligne ${rowNum} (${rowId}) : ${actionText} avec succès.`,
              ...prev.slice(0, 49) // limit log box length
            ]);
          } else {
            errorCount++;
            const errMsg = res?.error || "Erreur de validation inconnue.";
            setImportLogs(prev => [
              `❌ Ligne ${rowNum} : ${errMsg}`,
              ...prev.slice(0, 49)
            ]);
          }
        } catch (err: any) {
          errorCount++;
          setImportLogs(prev => [
            `❌ Ligne ${rowNum} : Erreur système : ${err.message}`,
            ...prev.slice(0, 49)
          ]);
        }

        setImportProgress({
          current: i + 1,
          total: parsedData.length,
          success: successCount,
          error: errorCount
        });
      }

      toast.success(`Importation terminée ! Succès : ${successCount}, Échecs : ${errorCount}`);
    });
  };

  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setParsedData([]);
    setColumnMapping({});
    setStep(1);
    setImportLogs([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-8 py-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-[24px] bg-white/85 backdrop-blur-md border border-white/40 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            📥 Importation Intelligente
            <Sparkles className="size-6 text-indigo-500 animate-pulse" />
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            استيراد البيانات الذكي · Importez vos élèves, employés et matières en quelques clics via Excel.
          </p>
        </div>

        {step === 2 && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all inline-flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Réinitialiser (إعادة تعيين)
          </button>
        )}
      </div>

      {/* MODE SELECTOR (Only active at step 1) */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: "student" as ImportType,
              title: "Élèves (الطلاب)",
              desc: "Importation des dossiers scolaires, frais, tuteurs...",
              icon: <Users className="size-6 text-indigo-600" />,
              color: "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
            },
            {
              id: "employee" as ImportType,
              title: "Personnel HR (الموظفون)",
              desc: "Importation des enseignants, comptables, salaires...",
              icon: <Briefcase className="size-6 text-emerald-600" />,
              color: "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
            },
            {
              id: "subject" as ImportType,
              title: "Matières / Curriculum (المواد)",
              desc: "Importation des matières, codes et départements...",
              icon: <BookOpen className="size-6 text-blue-600" />,
              color: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
            },
            {
              id: "exam_result" as ImportType,
              title: "Notes & Résultats (الدرجات)",
              desc: "Importation des notes d'examen et appréciations...",
              icon: <Award className="size-6 text-amber-600" />,
              color: "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
            }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "p-6 rounded-[24px] border-2 text-left transition-all duration-300 shadow-sm relative overflow-hidden group",
                activeTab === tab.id
                  ? "border-indigo-600 bg-white/90 shadow-md ring-4 ring-indigo-500/10"
                  : "border-white/50 bg-white/60 hover:shadow-sm"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                  {tab.icon}
                </div>
                {activeTab === tab.id && (
                  <span className="w-3 h-3 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 animate-ping" />
                )}
              </div>
              <h3 className="mt-4 font-black text-slate-800 text-lg">{tab.title}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">{tab.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* STEP 1: FILE UPLOAD ZONE */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Instructions Box */}
          <div className="lg:col-span-1 rounded-[24px] bg-white/80 border border-white/50 p-6 space-y-4 shadow-sm">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-indigo-500" />
              Instructions de Remplissage
            </h3>
            
            <div className="text-xs text-slate-600 space-y-3 font-semibold leading-relaxed">
              <p>
                1. Téléchargez le modèle Excel pré-configuré pour le type de données sélectionné.
              </p>
              <p>
                2. Les colonnes marquées d&apos;une astérisque (<strong>*</strong>) sont obligatoires et doivent être remplies pour chaque ligne.
              </p>
              <p>
                3. Pour le sexe, utilisez <strong>Garçon</strong> / <strong>Fille</strong> (ou Homme / Femme pour les employés).
              </p>
              <p>
                4. Les dates doivent respecter le format standard <strong>JJ/MM/AAAA</strong>.
              </p>
              <p>
                5. Ne changez pas l&apos;ordre ou les intitulés des colonnes pour un mappage automatique à 100%.
              </p>
            </div>

            <button
              onClick={() => handleDownloadTemplate(activeTab)}
              className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
            >
              <Download className="size-4 group-hover:-translate-y-0.5 transition-transform" />
              Télécharger le Modèle (تحميل النموذج)
            </button>
          </div>

          {/* Upload Area */}
          <div className="lg:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 bg-white/70 hover:bg-white hover:border-indigo-400 transition-all rounded-[24px] p-12 text-center shadow-sm min-h-[340px] group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Upload className="size-7" />
              </div>
              <h3 className="mt-6 text-lg font-black text-slate-800">
                Glissez & Déposez votre fichier Excel ici
              </h3>
              <p className="mt-2 text-xs font-semibold text-slate-500 max-w-sm">
                Uniquement les fichiers au format Excel <strong>.xlsx</strong>. Taille maximale de 10 Mo.
              </p>
              
              <div className="mt-8 px-6 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors">
                Sélectionner un fichier (اختيار ملف)
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING & PREVIEW */}
      {step === 2 && (
        <div className="space-y-6">
          {/* COLUMN MAPPING PANEL */}
          <div className="rounded-[24px] bg-white border border-white/50 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <ArrowRight className="size-5 text-indigo-500" />
                Correspondance des Colonnes (ربط الأعمدة)
              </h3>
              <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-500">
                {parsedData.length} lignes chargées
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FIELDS[activeTab].map(field => {
                const isMapped = columnMapping[field.key] && columnMapping[field.key] !== "Ignorer";
                return (
                  <div
                    key={field.key}
                    className={cn(
                      "p-4 rounded-2xl border transition-all space-y-2.5",
                      field.required
                        ? isMapped
                          ? "border-emerald-200 bg-emerald-50/10"
                          : "border-rose-200 bg-rose-50/10"
                        : isMapped
                        ? "border-indigo-100 bg-indigo-50/5"
                        : "border-slate-100 bg-slate-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700">
                        {field.label}
                      </label>
                      {field.required && !isMapped && (
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          Requis
                        </span>
                      )}
                    </div>

                    <select
                      value={columnMapping[field.key] || "Ignorer"}
                      onChange={(e) => {
                        setColumnMapping(prev => ({
                          ...prev,
                          [field.key]: e.target.value
                        }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="Ignorer">🚫 Ignorer ce champ</option>
                      {headers.map(h => (
                        <option key={h} value={h}>
                          📋 {h}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                onClick={startImport}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Play className="size-4" />
                Lancer l&apos;importation (بدء الاستيراد)
              </button>
            </div>
          </div>

          {/* PARSED DATA PREVIEW */}
          <div className="rounded-[24px] bg-white border border-white/50 shadow-sm p-6 overflow-hidden">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 pb-4 border-b border-slate-100">
              <Table className="size-5 text-indigo-500" />
              Aperçu des Données (Aperçu des 5 premières lignes)
            </h3>
            
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">#</th>
                    {headers.map(h => (
                      <th key={h} className="py-3 px-4 text-xs font-black text-slate-700 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-400">{idx + 2}</td>
                      {headers.map(h => (
                        <td key={h} className="py-3.5 px-4 text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                          {row[h] instanceof Date ? row[h].toLocaleDateString("fr-FR") : String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 5 && (
                <div className="py-4 text-center text-xs font-bold text-slate-400">
                  Et {parsedData.length - 5} autres lignes...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: EXECUTING & PROGRESS */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Progress Dashboard */}
          <div className="lg:col-span-1 rounded-[24px] bg-white border border-white/50 p-6 shadow-sm space-y-6">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              {isPending ? (
                <Loader2 className="size-5 text-indigo-500 animate-spin" />
              ) : (
                <CheckCircle2 className="size-5 text-emerald-500" />
              )}
              Statut de l&apos;Importation
            </h3>

            {/* Circular or Linear Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Progression</span>
                <span>
                  {importProgress.current} / {importProgress.total} (
                  {Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / (importProgress.total || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Ingestion Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                <p className="text-2xl font-black text-emerald-600">{importProgress.success}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Succès</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-center">
                <p className="text-2xl font-black text-rose-600">{importProgress.error}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Échecs</p>
              </div>
            </div>

            {!isPending && (
              <button
                onClick={handleReset}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="size-4" />
                Retourner & Importer à nouveau
              </button>
            )}
          </div>

          {/* Activity Logs Console */}
          <div className="lg:col-span-2 rounded-[24px] bg-slate-950 text-slate-100 p-6 shadow-xl relative overflow-hidden font-mono text-xs flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full" />
                <span className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="font-bold text-slate-400 ml-2">logs_importation.sh</span>
              </div>
              {isPending && (
                <span className="inline-flex items-center gap-1.5 text-indigo-400 animate-pulse font-bold">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                  Traitement...
                </span>
              )}
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-2 select-text custom-scrollbar pr-2">
              {importLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
              {importLogs.length === 0 && (
                <div className="text-slate-500 italic text-center py-24">
                  En attente du lancement de l&apos;importation...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
