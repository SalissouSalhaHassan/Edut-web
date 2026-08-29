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
  return {
    ...defaultDocumentHeaderConfig,
    ...(input || {}),
    levelProfiles: input?.levelProfiles || [],
  };
}

/**
 * Resolves the specific header config for a given educational level
 * Supports single levels (e.g. "Primaire"), merged levels (e.g. "Primaire, College"), or fallback to global.
 */
export function getActiveLevelHeaderConfig(
  baseConfig: DocumentHeaderConfig,
  targetLevel?: string | null
): DocumentHeaderConfig {
  if (!targetLevel || !baseConfig.levelProfiles || baseConfig.levelProfiles.length === 0) {
    return baseConfig;
  }

  const cleanTarget = targetLevel.trim().toLowerCase();

  // Find matching profile whose applicableLevels includes targetLevel
  const matchedProfile = baseConfig.levelProfiles.find((profile) =>
    profile.applicableLevels.some(
      (lvl) =>
        lvl.toLowerCase() === cleanTarget ||
        cleanTarget.includes(lvl.toLowerCase()) ||
        lvl.toLowerCase().includes(cleanTarget)
    )
  );

  if (!matchedProfile || !matchedProfile.headerConfig) {
    return baseConfig;
  }

  const overrides = matchedProfile.headerConfig;

  return {
    ...baseConfig,
    ...overrides,
    leftLogo: matchedProfile.leftLogo || matchedProfile.customLogo || overrides.leftLogo || baseConfig.leftLogo,
    centerLogo: matchedProfile.centerLogo || overrides.centerLogo || baseConfig.centerLogo,
    rightLogo: matchedProfile.rightLogo || overrides.rightLogo || baseConfig.rightLogo,
    levelProfiles: baseConfig.levelProfiles,
    activeLevelProfileId: matchedProfile.id,
  };
}
