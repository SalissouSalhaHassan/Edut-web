import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { type, recipientPhone, recipientName, studentName, className, date, subjectName, amount, receiptNumber, message } = body;

    if (!recipientPhone || !recipientPhone.trim()) {
      return mobileJsonError("Numéro de téléphone WhatsApp requis.", 400);
    }

    // Clean phone number (format for Niger/West Africa or international)
    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length === 8) {
      cleanPhone = `227${cleanPhone}`; // Niger prefix fallback
    }

    let generatedText = "";

    switch (type) {
      case "absence":
        generatedText = `*ÉTABLISSEMENT SCOLAIRE EDUT* 🏫\n\nCher parent (*${recipientName || "Parent d'élève"}*),\nNous vous informons que votre enfant *${studentName || "l'élève"}* (Classe: ${className || "N/A"}) a été marqué(e) *ABSENT(E)* le *${date || new Date().toLocaleDateString("fr-FR")}* lors du cours de *${subjectName || "la séance"}*.\n\n_Pour toute justification, veuillez vous connecter sur l'application mobile Edut ou contacter la vie scolaire._`;
        break;

      case "receipt":
        generatedText = `*CONFIRMATION DE PAIEMENT EDUT* 💳\n\nBonjour *${recipientName || "Parent"}*,\nNous accusons réception du règlement de scolarité d'un montant de *${amount || "0"} FCFA* pour l'élève *${studentName || ""}*.\nReçu N° : *${receiptNumber || "REC-" + Date.now()}*\nDate : ${date || new Date().toLocaleDateString("fr-FR")}\n\n_Le reçu officiel certifié PDF est téléchargeable sur votre application Edut._`;
        break;

      case "bulletin":
        generatedText = `*BULLETIN DE NOTES DISPONIBLE* 📊\n\nBonjour *${recipientName || "Parent"}*,\nLe bulletin scolaire trimestriel de *${studentName || "votre enfant"}* (${className || ""}) est désormais disponible et consultable en ligne sur l'application Edut.\n\n_Félicitations pour le suivi de la scolarité de vos enfants._`;
        break;

      case "custom":
      default:
        generatedText = message || `*MESSAGE DE L'ÉCOLE EDUT* 📢\n\n${message || "Information importante de la direction."}`;
        break;
    }

    const waLink = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(generatedText)}`;

    return NextResponse.json({
      success: true,
      data: {
        phone: cleanPhone,
        message: generatedText,
        whatsappLink: waLink,
        status: "generated",
      },
    });
  } catch (error: any) {
    console.error("[WhatsApp API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de génération WhatsApp", 500);
  }
}
