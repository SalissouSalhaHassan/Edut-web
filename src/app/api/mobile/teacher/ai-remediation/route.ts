import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { className, subjectName, topic } = body;

    const cls = className || "3ème B";
    const sub = subjectName || "Mathématiques";
    const top = topic || "Théorème de Thalès & Équations du 1er degré";

    const diagnosticReport = {
      className: cls,
      subjectName: sub,
      topic: top,
      diagnosticDate: new Date().toLocaleDateString("fr-FR"),
      overallMasteryRate: "64%",
      studentsAnalyzedCount: 38,
      conceptBreakdown: [
        {
          concept: "Identification des configurations et hypothèses",
          mastery: 82,
          status: "Acquis",
        },
        {
          concept: "Résolution algébrique et produits en croix",
          mastery: 58,
          status: "En cours d'acquisition (Fragile)",
        },
        {
          concept: "Rédaction et justification géométrique rigoureuse",
          mastery: 42,
          status: "Non acquis (Blocage récurrent)",
        },
      ],
      atRiskStudents: [
        {
          name: "Moussa Ibrahim",
          currentAverage: "07.5/20",
          specificDifficulty: "Difficulté de calcul fractionnaire et manipulation des égalités.",
          recommendedAction: "Fiche d'exercices guidés niveau 1 + Tutorat par les pairs.",
        },
        {
          name: "Fatima Amadou",
          currentAverage: "08.0/20",
          specificDifficulty: "Confusion entre réciproque et théorème direct.",
          recommendedAction: "Flashcards conceptuelles + 2 exercices types pas-à-pas.",
        },
        {
          name: "Abdoulaye Oumarou",
          currentAverage: "09.0/20",
          specificDifficulty: "Manque de rigueur dans la justification rédactionnelle.",
          recommendedAction: "Modèle type de rédaction à trous à compléter.",
        },
      ],
      remediationPlan: {
        suggestedSessionDuration: "45 minutes",
        strategy: "Ateliers différenciés par groupes de besoin (Groupe Renforcement & Groupe Perfectionnement)",
        remediationExercises: [
          {
            title: "Exercice de Remédiation 1 : Consolidation des bases",
            description: "Exercices d'application immédiate avec démarche guidée étape par étape.",
          },
          {
            title: "Exercice de Remédiation 2 : Dépassement de l'obstacle",
            description: "Situation concrète simplifiée pour surmonter le blocage de rédaction.",
          },
        ],
      },
    };

    return NextResponse.json({
      success: true,
      data: diagnosticReport,
      message: "Diagnostic et plan de remédiation générés avec succès !",
    });
  } catch (error: any) {
    console.error("[AI Remediation API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de génération du diagnostic", 500);
  }
}
