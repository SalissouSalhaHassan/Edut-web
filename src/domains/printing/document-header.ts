export type DocumentHeaderStyle =
  | "classic_dual_logo"
  | "bilingual_center_logo"
  | "university_formal"
  | "modern_card"
  | "minimal_administrative";

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
  inspectionAr: "مفتشية التربية الوطنية",
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
};

export function mergeDocumentHeaderConfig(input?: Partial<DocumentHeaderConfig> | null): DocumentHeaderConfig {
  return {
    ...defaultDocumentHeaderConfig,
    ...(input || {}),
  };
}
