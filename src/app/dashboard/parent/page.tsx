import React from "react";
import ParentDashboard from "./parent-dashboard";
import { getParentPortalDataAction } from "@/domains/parent/actions/parent.actions";
import { getCurrentUser } from "@/domains/auth/services/session";

export const metadata = {
  title: "Espace Parents & Mobile App | Edut Pro",
  description: "Portail de suivi direct pour les parents d'élèves (assiduité, notes, bulletin, carte scolaire et paiement Mobile Money)."
};

export default async function ParentPage() {
  const currentUser = await getCurrentUser();
  const res = await getParentPortalDataAction();

  const initialData = (res && res.success && res.data) ? res.data : {
    children: [],
    selectedChild: null,
    attendance: { totalSessions: 0, presents: 0, absents: 0, retards: 0, excused: 0, rate: 100, logs: [] },
    academics: { averageGrade: 0, rank: "-", subjects: [], recentGrades: [] },
    finances: { totalExpected: 0, totalPaid: 0, balance: 0, status: "Impayé", paidPercentage: 0, feeDetails: { fraisMensuels: 0, fraisInscription: 0, fraisTransport: 0, fraisCantine: 0, fraisCoges: 0 }, paymentHistory: [] },
    studentCard: { cardId: "CARD-000", schoolName: currentUser?.schoolName || "Établissement Scolaire", academicYear: "2024-2025", qrCodeUrl: "https://edut.ne" },
    announcements: []
  };

  const branding = {
    name: currentUser?.schoolName || "Établissement Scolaire Edut Pro",
    logoPath: null
  };

  return <ParentDashboard initialData={initialData} currentUser={currentUser} branding={branding} />;
}
