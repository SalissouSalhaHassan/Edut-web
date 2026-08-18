import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { question, subject, educationalLevel, studentName } = body;

    if (!question || !question.trim()) {
      return mobileJsonError("Question requise.", 400);
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        answer: `Bonjour ${studentName || "cher élève"} ! En réponse à votre question sur les ${subject || "cours"} : pour bien assimiler cette notion, rappelez-vous que la régularité et la méthode sont la clé. Pouvez-vous me préciser l'exercice ou le calcul sur lequel vous bloquez ?`,
        subject: subject || "Général",
      });
    }

    const systemPrompt = `Tu es "Edut AI Tutor", le professeur et tuteur pédagogique personnel intelligent de l'élève ${studentName || ""}.
Niveau scolaire : ${educationalLevel || "Secondaire / Collège-Lycée"}.
Matière : ${subject || "Matières Générales"}.
Consignes pédagogiques impératives :
1. Réponds en français clair, bienveillant, structuré et très encourageant.
2. Utilise des étapes numérotées, des puces claires, et des exemples concrets adaptés au programme scolaire.
3. Si c'est une question de mathématiques ou sciences, donne d'abord la formule clé, puis la résolution étape par étape.
4. Termine toujours par une petite question stimulante pour vérifier la compréhension de l'élève ou lui proposer un exercice similaire.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: `Question de l'élève : ${question}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.warn("[AI Tutor] Gemini API error, fallback response:", errText);
      return NextResponse.json({
        success: true,
        answer: `Voici une explication pour votre question : \n\n1. **Principe fondamental** : Comprenez bien la définition du sujet en ${subject || "cours"}.\n2. **Application pratique** : Appliquez les règles vues en classe.\n\nAvez-vous besoin d'un exemple guidé ?`,
        subject: subject || "Général",
      });
    }

    const data = await geminiRes.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const answer = candidateText || "Désolé, je n'ai pas pu formuler une réponse complète. Pouvez-vous reformuler votre question ?";

    return NextResponse.json({
      success: true,
      answer,
      subject: subject || "Général",
    });
  } catch (error: any) {
    console.error("[AI Tutor POST] Error:", error);
    return mobileJsonError(error?.message || "Erreur lors du traitement IA", 500);
  }
}
