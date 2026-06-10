"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Filter } from "lucide-react";

import { getFilterOptions } from "../actions/academics.actions";

interface AcademicFiltersProps {
  onLoad: (filters: any) => void;
  loading?: boolean;
}

export default function AcademicFilters({ onLoad, loading }: AcademicFiltersProps) {
  const [options, setOptions] = useState<any>({
    sessions: [],
    sections: [],
    classes: [],
    subjects: [],
    classSubjectLinks: [],
    sectionSubjectLinks: [],
    periods: [],
    levels: [],
  });

  const [session, setSession] = useState("");
  const [level, setLevel] = useState("Lycée");
  const [sectionId, setSectionId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [period, setPeriod] = useState("");

  useEffect(() => {
    async function loadOptions() {
      // Try to load from session storage first for instant response
      const cached = sessionStorage.getItem("academic_filter_options");
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setOptions(cachedData);
          if (cachedData.sessions?.length > 0 && !session) {
            setSession(cachedData.sessions[0].id.toString());
          }
        } catch (e) {
          console.error("Failed to parse cached options", e);
        }
      }

      console.log("[AcademicFilters] Loading fresh options...");
      const result = await getFilterOptions();
      const data = (result as any)?.data || result;

      if (data && data.sessions) {
        setOptions(data);
        sessionStorage.setItem("academic_filter_options", JSON.stringify(data));
        if (data.sessions.length > 0 && !session) {
          setSession(data.sessions[0].id.toString());
        }
      }
    }
    loadOptions();
  }, []);

  // Calculate filtered sections
  const filteredSections = useMemo(() => {
    return (options.sections || []).filter((s: any) => (s.educationalLevel || "Lycée") === level);
  }, [level, options.sections]);

  // Calculate filtered classes
  const filteredClasses = useMemo(() => {
    return options.classes.filter((c: any) => c.sectionId?.toString() === sectionId);
  }, [sectionId, options.classes]);

  // Calculate filtered subjects with fallback to section subjects
  const filteredSubjects = useMemo(() => {
    // 1. Try class-specific subjects
    let subjectIds = (options.classSubjectLinks || [])
      .filter((l: any) => l.classId?.toString() === classId)
      .map((l: any) => l.subjectId?.toString());

    // 2. Fallback to section-specific subjects if no class links exist
    if (subjectIds.length === 0 && classId) {
       const cls = options.classes.find((c: any) => c.id.toString() === classId);
       if (cls?.sectionId) {
          subjectIds = (options.sectionSubjectLinks || [])
             .filter((l: any) => l.sectionId?.toString() === cls.sectionId.toString())
             .map((l: any) => l.subjectId?.toString());
       }
    }

    return options.subjects.filter((s: any) => subjectIds.includes(s.id.toString()));
  }, [classId, sectionId, options.classSubjectLinks, options.sectionSubjectLinks, options.subjects]);

  // Handle Level -> Section auto-selection
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!filteredSections.find((s: any) => s.id.toString() === sectionId)) {
        setSectionId(filteredSections[0].id.toString());
      }
    } else {
      setSectionId("");
    }
  }, [level, filteredSections]);

  // Handle Section -> Class auto-selection
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!filteredClasses.find((c: any) => c.id.toString() === classId)) {
        setClassId(filteredClasses[0].id.toString());
      }
    } else {
      setClassId("");
    }
  }, [sectionId, filteredClasses]);

  // Handle Class -> Subject auto-selection
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.find((s: any) => s.id.toString() === subjectId)) {
        setSubjectId(filteredSubjects[0].id.toString());
      }
    } else {
      setSubjectId("");
    }
  }, [classId, filteredSubjects]);

  const levels = options.levels && options.levels.length > 0 
    ? options.levels.map((l: any) => l.levelName)
    : Array.from(new Set(options.sections.map((s: any) => s.educationalLevel || "Lycée"))) as string[];
    
  if (levels.length === 0) levels.push("Lycée");

  const handleLoad = () => {
    if (!session || !level || !sectionId || !classId || !subjectId || !period) {
      alert("Veuillez sélectionner tous les filtres.");
      return;
    }

    const selectedSession = options.sessions.find((s: any) => s.id.toString() === session);
    const selectedClass = options.classes.find((c: any) => c.id.toString() === classId);

    onLoad({
      sessionId: parseInt(session),
      sessionName: selectedSession?.sessionName || "",
      level,
      sectionId: parseInt(sectionId),
      classId: parseInt(classId),
      className: selectedClass?.className || "",
      subjectId: parseInt(subjectId),
      period
    });
  };

  const mapToOptions = (items: any[], nameKey: string, altKey?: string) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item: any) => {
      const name = item[nameKey] || (altKey ? item[altKey] : "") || item.name || item.title || item.label || `ID: ${item.id}`;
      return {
        id: item.id.toString(),
        name: name.toString()
      };
    });
  };

  const currentSection = options.sections.find((s: any) => s.id.toString() === sectionId);

  // periodOptions should now come from the database based on the selected session
  let periodOptions: { id: string, name: string }[] = [];
  if (options.periods && options.periods.length > 0) {
    const sessionPeriods = options.periods.filter((p: any) => p.sessionId?.toString() === session);
    if (sessionPeriods.length > 0) {
      periodOptions = sessionPeriods.map((p: any) => ({ id: p.name, name: p.name }));
    } else {
      // Fallback if no periods found for session but periods exist in DB
      periodOptions = options.periods.map((p: any) => ({ id: p.name, name: p.name }));
    }
  } else {
    // Legacy fallback based on section numTerms
    if (currentSection?.termLabels) {
      periodOptions = currentSection.termLabels.split(",").map((l: string) => ({ id: l.trim(), name: l.trim() }));
    } else {
      const numTerms = currentSection?.numTerms || 3;
      if (numTerms === 2) {
        periodOptions = [
          { id: "1er Semestre", name: "1er Semestre" },
          { id: "2ème Semestre", name: "2ème Semestre" }
        ];
      } else {
        periodOptions = [
          { id: "1er Trimestre", name: "1er Trimestre" },
          { id: "2ème Trimestre", name: "2ème Trimestre" },
          { id: "3ème Trimestre", name: "3ème Trimestre" }
        ];
      }
    }
  }

  // Auto-update period if current value is not in options
  useEffect(() => {
    if (periodOptions.length > 0) {
      if (!periodOptions.find((p: any) => p.id === period)) {
        setPeriod(periodOptions[0].id);
      }
    }
  }, [periodOptions]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <Filter size={20} className="text-indigo-600" />
        </div>
        <h3 className="text-lg font-black text-slate-900">Filtres Académiques</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
        <FilterGroup
          label="Session"
          value={session}
          onChange={setSession}
          options={mapToOptions(options.sessions, "sessionName", "session_name")}
        />

        <FilterGroup
          label="Niveau"
          value={level}
          onChange={(v: string) => { setLevel(v); }}
          options={levels.map((l: any) => ({ id: l, name: l }))}
        />

        <FilterGroup
          label="Série/Section"
          value={sectionId}
          onChange={setSectionId}
          options={mapToOptions(filteredSections, "sectionName", "section_name")}
        />

        <FilterGroup
          label="Classe"
          value={classId}
          onChange={setClassId}
          options={mapToOptions(filteredClasses, "className", "class_name")}
        />

        <FilterGroup
          label="Matière"
          value={subjectId}
          onChange={setSubjectId}
          options={mapToOptions(filteredSubjects, "subjectName", "subject_name")}
        />

        <FilterGroup
          label="Période"
          value={period}
          onChange={setPeriod}
          options={periodOptions}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleLoad}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 h-12 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          <span>Charger la grille</span>
        </Button>
      </div>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11 font-medium focus:ring-indigo-500/20">
          <SelectValue placeholder={`Choisir...`} />
        </SelectTrigger>
        <SelectContent className="bg-white border-slate-200 rounded-xl">
          {options.map((opt: { id: string, name: string }) => (
            <SelectItem key={opt.id} value={opt.id} className="focus:bg-slate-50 focus:text-slate-900">
              {opt.name}
            </SelectItem>
          ))}
          {options.length === 0 && <div className="p-4 text-xs text-slate-500 text-center">Aucune option</div>}
        </SelectContent>
      </Select>
    </div>
  );
}