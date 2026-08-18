import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { action, studentName, subjectName, score, className, lessonTitle, questionCount } = body;

    // Action 1: Generate Grade Appreciation
    if (action === "generateAppreciation") {
      const studentScore = Number(score || 12);
      
      if (!GEMINI_API_KEY) {
        let fallback = "Bon travail dans l'ensemble. Continuez ainsi avec régularité.";
        if (studentScore >= 16) fallback = "Excellent trimestre ! Travail remarquable et rigoureux.";
        else if (studentScore >= 14) fallback = "Très bon travail. Résultats solides et encourageants.";
        else if (studentScore >= 10) fallback = "Trimestre satisfaisant. Peut encore progresser avec plus d'investissement.";
        else if (studentScore >= 7) fallback = "Résultats insuffisants. Des efforts soutenus sont indispensables au prochain trimestre.";
        else fallback = "Niveau très fragile. Un travail de fond et un soutien régulier sont requis.";

        return NextResponse.json({
          success: true,
          appreciation: fallback,
        });
      }

      const prompt = `Génère une appréciation scolaire concise (1 à 2 phrases max, 25 mots max), professionnelle et constructive pour le bulletin d'un élève.
Élève : ${studentName || "L'élève"}
Matière : ${subjectName || "Matière"}
Moyenne obtenue : ${studentScore}/20
Classe : ${className || "Classe"}
Consignes :
- Ton bienveillant, clair et pédagogique.
- Ne pas mettre de guillemets autour du texte.
- Si la note est >= 14, féliciter. Si la note est entre 10 et 13.9, encourager. Si la note est < 10, donner un conseil précis pour progresser.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 100 }
        })
      });

      let appreciation = "Travail sérieux. Poursuivez vos efforts avec détermination.";
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) appreciation = text;
      }

      return NextResponse.json({
        success: true,
        appreciation,
      });
    }

    // Action 2: Generate Quiz / Homework Exercises
    if (action === "generateQuiz" || action === "generateExercises") {
      const count = Number(questionCount || 3);
      const title = lessonTitle || "Révision générale";
      const subject = subjectName || "Général";

      if (!GEMINI_API_KEY) {
        return NextResponse.json({
          success: true,
          questions: [
            {
              id: 1,
              question: `Définir les notions clés de la leçon : ${title}.`,
              type: "ouverte",
              points: 5,
            },
            {
              id: 2,
              question: `Citer 2 applications directes des principes vus en cours de ${subject}.`,
              type: "ouverte",
              points: 5,
            },
            {
              id: 3,
              question: `Résoudre l'exercice d'application récapitulatif sur ${title}.`,
              type: "ouverte",
              points: 10,
            }
          ]
        });
      }

      const prompt = `Génère ${count} questions d'exercices scolaires progressives et pertinentes pour un devoir sur la leçon suivante :
Matière : ${subject}
Titre de la leçon : ${title}
Niveau : ${className || "Secondaire"}

Format de réponse STRICT : Réponds UNIQUEMENT avec un tableau JSON valide au format suivant sans markdown :
[
  {
    "id": 1,
    "question": "Texte de la question...",
    "type": "QCM ou ouverte",
    "points": 5,
    "hint": "Indice pour l'élève..."
  }
]`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 800 }
        })
      });

      let questions: any[] = [];
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        try {
          const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
          questions = JSON.parse(cleaned);
        } catch (_) {
          questions = [
            { id: 1, question: `Expliquer les points clés de ${title}`, points: 10 }
          ];
        }
      }

      return NextResponse.json({
        success: true,
        questions,
      });
    }

    return mobileJsonError("Action invalide.", 400);
  } catch (error: any) {
    console.error("[Teacher Copilot API Error]:", error);
    return mobileJsonError(error?.message || "Erreur assistant enseignant", 500);
  }
}
