export type DocumentHeaderStyle =
  | "classic_dual_logo"
  | "bilingual_center_logo"
  | "university_formal"
  | "modern_card"
  | "minimal_administrative";

export type EducationalLevelKey =
  | "Primaire"
  | "College"
  | "Lycée"
  | "University"
  | "Autre"
  | string;

export type LevelHeaderProfile = {
  id: string;
  name: string;
  applicableLevels: EducationalLevelKey[]; // e.g. ["Primaire"], ["College"], ["Lycée"], or ["Primaire", "College"]
  customLogo?: string;
  leftLogo?: string;
  centerLogo?: string;
  rightLogo?: string;
  headerConfig: Partial<DocumentHeaderConfig>;
};

export type DocumentHeaderConfig = {
  style: DocumentHeaderStyle;
  schoolName: string;
  schoolNameAr?: string;
  country?: string;
  countryAr?: string;
  ministry?: string;
  ministryAr?: string;
  regionalDirection?: string;
  regionalDirectionAr?: string;
  departmentalDirection?: string;
  departmentalDirectionAr?: string;
  inspection?: string;
  inspectionAr?: string;
  commune?: string;
  communeAr?: string;
  schoolCode?: string;
  schoolCodeAr?: string;
  service?: string;
  serviceAr?: string;
  address?: string;
  addressAr?: string;
  bp?: string;
  phone?: string;
  email?: string;
  schoolYear?: string;
  motto?: string;
  mottoAr?: string;
  authorizationText?: string;
  leftLogo?: string;
  centerLogo?: string;
  rightLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  titleFont?: string;
  titleSize?: number;
  bilingual?: boolean;
  documentTypes?: string[];
  isDefault?: boolean;
  
  // Multi-Level & Custom Profile Extension
  levelProfiles?: LevelHeaderProfile[];
  activeLevelProfileId?: string;
};

export const DOCUMENT_HEADER_SETTING_KEY = "official_document_header";

export const defaultDocumentHeaderConfig: DocumentHeaderConfig = {
  style: "classic_dual_logo",
  schoolName: "ÉCOLE EXCELLENCE",
  schoolNameAr: "مدرسة التميز",
  country: "RÉPUBLIQUE DU NIGER",
  countryAr: "جمهورية النيجر",
  ministry: "Ministère de l'Éducation Nationale",
  ministryAr: "وزارة التربية الوطنية",
  regionalDirection: "Direction Régionale de l'Éducation Nationale",
  regionalDirectionAr: "المديرية الجهوية للتربية الوطنية",
  departmentalDirection: "Direction Départementale de l'Éducation Nationale",
  departmentalDirectionAr: "المديرية الإقليمية للتربية الوطنية",
  inspection: "Inspection de l'Enseignement Primaire & Secondaire",
  inspectionAr: "مفتشية التربية والتعليم",
  commune: "Commune de Niamey IV",
  communeAr: "بلدية نيامي 4",
  schoolCode: "ETB-2026-001",
  service: "Service de la Scolarité",
  serviceAr: "مصلحة شؤون الطلاب",
  schoolYear: "2024 - 2025",
  motto: "Discipline - Travail - Réussite",
  mottoAr: "انضباط - عمل - نجاح",
  primaryColor: "#4f46e5",
  secondaryColor: "#10b981",
  titleFont: "serif",
  titleSize: 26,
  bilingual: false,
  documentTypes: ["reports", "receipts", "transcripts", "certificates", "cards"],
  isDefault: true,
  levelProfiles: [],
};

export function mergeDocumentHeaderConfig(input?: Partial<DocumentHeaderConfig> | null): DocumentHeaderConfig {
  const rawProfiles = Array.isArray(input?.levelProfiles) ? input.levelProfiles : [];
  const safeProfiles: LevelHeaderProfile[] = rawProfiles.map((p: any, idx: number) => ({
    id: String(p?.id || `profile_${idx}`),
    name: String(p?.name || "Profil sans nom"),
    applicableLevels: Array.isArray(p?.applicableLevels)
      ? p.applicableLevels.map(String)
      : typeof p?.applicableLevels === "string" && p.applicableLevels
      ? [p.applicableLevels]
      : [],
    leftLogo: p?.leftLogo || p?.customLogo || undefined,
    centerLogo: p?.centerLogo || undefined,
    rightLogo: p?.rightLogo || undefined,
    customLogo: p?.customLogo || undefined,
    headerConfig: typeof p?.headerConfig === "object" && p?.headerConfig !== null ? p.headerConfig : {},
  }));

  return {
    ...defaultDocumentHeaderConfig,
    ...(input || {}),
    levelProfiles: safeProfiles,
  };
}

function normalizeLevel(val: string): string {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const LEVEL_GROUPS: Record<string, string[]> = {
  maternelle: ["maternelle", "creche", "prescolaire", "petite", "moyenne", "grande"],
  primaire: ["primaire", "elementaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2", "1ere annee", "2eme annee", "3eme annee", "4eme annee", "5eme annee", "6eme annee"],
  college: ["college", "moyen", "cem", "6eme", "5eme", "4eme", "3eme", "brevet", "bepc"],
  lycee: ["lycee", "secondaire", "2nde", "1ere", "tle", "terminale", "bac", "scientifique", "litteraire", "technique"],
  university: ["university", "universite", "superieur", "licence", "master", "doctorat", "lmd", "l1", "l2", "l3", "m1", "m2", "faculte", "institut", "bts", "dut"],
};

export function isLevelMatching(candidateLevel: string, targetLevel: string): boolean {
  const normCandidate = normalizeLevel(candidateLevel);
  const normTarget = normalizeLevel(targetLevel);

  if (!normCandidate || !normTarget) return false;
  if (normCandidate === normTarget) return true;
  if (normCandidate.includes(normTarget) || normTarget.includes(normCandidate)) return true;

  // Check group aliases
  for (const [, aliases] of Object.entries(LEVEL_GROUPS)) {
    const candidateInGroup = aliases.some((a) => normCandidate.includes(a) || a.includes(normCandidate));
    const targetInGroup = aliases.some((a) => normTarget.includes(a) || a.includes(normTarget));
    if (candidateInGroup && targetInGroup) return true;
  }

  return false;
}

/**
 * Resolves the specific header config for a given educational level
 * Supports single levels (e.g. "Primaire"), merged levels (e.g. "Primaire, College"), or fallback to global.
 */
export function getActiveLevelHeaderConfig(
  baseConfig: DocumentHeaderConfig,
  targetLevel?: string | null
): DocumentHeaderConfig {
  const safeBase = mergeDocumentHeaderConfig(baseConfig);
  if (!targetLevel || !safeBase.levelProfiles || safeBase.levelProfiles.length === 0) {
    return safeBase;
  }

  // Find matching profile whose applicableLevels includes targetLevel or matches fusion
  const matchedProfile = safeBase.levelProfiles.find((profile) => {
    if (Array.isArray(profile.applicableLevels) && profile.applicableLevels.length > 0) {
      const hasMatch = profile.applicableLevels.some((lvl) => isLevelMatching(String(lvl), targetLevel));
      if (hasMatch) return true;
    }
    if (profile.name && isLevelMatching(profile.name, targetLevel)) {
      return true;
    }
    return false;
  });

  if (!matchedProfile || !matchedProfile.headerConfig) {
    return safeBase;
  }

  const overrides = matchedProfile.headerConfig;

  return {
    ...safeBase,
    ...overrides,
    leftLogo: matchedProfile.leftLogo || matchedProfile.customLogo || overrides.leftLogo || safeBase.leftLogo,
    centerLogo: matchedProfile.centerLogo || overrides.centerLogo || safeBase.centerLogo,
    rightLogo: matchedProfile.rightLogo || overrides.rightLogo || safeBase.rightLogo,
    levelProfiles: safeBase.levelProfiles,
    activeLevelProfileId: matchedProfile.id,
  };
}
