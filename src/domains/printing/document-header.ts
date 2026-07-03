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
  ministry?: string;
  regionalDirection?: string;
  departmentalDirection?: string;
  inspection?: string;
  service?: string;
  address?: string;
  bp?: string;
  phone?: string;
  email?: string;
  schoolYear?: string;
  motto?: string;
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
  country: "RÉPUBLIQUE DU NIGER",
  ministry: "Ministère de l'Éducation Nationale",
  regionalDirection: "Direction Régionale de l'Éducation Nationale",
  departmentalDirection: "Direction Départementale de l'Éducation Nationale",
  service: "Service de la Scolarité",
  schoolYear: "2024 - 2025",
  motto: "Discipline - Travail - Réussite",
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
