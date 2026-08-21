import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";
import { CheckCircle, XCircle, Shield, GraduationCap, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
  return {
    title: "Vérification d'Attestation | Edut",
    description: "Vérifiez l'authenticité d'un diplôme ou d'une attestation scolaire",
  };
}

async function verifyCertPublic(code: string) {
  try {
    const rows = await db.execute(sql`
      SELECT dc.*
      FROM digital_certificates dc
      WHERE dc.verification_code = ${code.trim()}
      LIMIT 1
    `);
    const cert = (rows as any[])[0];
    if (!cert) return { valid: false, message: "Certificat introuvable — code invalide ou inexistant" };

    // Log the verification
    await db.execute(sql`
      INSERT INTO certificate_verification_logs (certificate_id, verification_code, result)
      VALUES (${cert.id}, ${code.trim()}, ${cert.is_valid ? "VALID" : "REVOKED"})
    `).catch(() => {});

    return { valid: !!cert.is_valid, revoked: !cert.is_valid, certificate: cert, revokedReason: cert.revoked_reason };
  } catch {
    return { valid: false, message: "Erreur lors de la vérification" };
  }
}

function fmtDate(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const result = await verifyCertPublic(params.code);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Header branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-2 mb-4">
            <Shield className="w-5 h-5 text-violet-300" />
            <span className="text-white font-bold text-sm">Système de Vérification Anti-Fraude</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Edut School Platform</h1>
          <p className="text-violet-300 text-sm">Vérification de l'authenticité d'un diplôme ou d'une attestation scolaire</p>
        </div>

        {/* Result card */}
        <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden ${!result.valid ? "ring-4 ring-red-400/50" : "ring-4 ring-emerald-400/50"}`}>
          {/* Status banner */}
          <div className={`px-6 py-4 flex items-center gap-3 ${result.valid ? "bg-emerald-500" : "bg-red-500"}`}>
            {result.valid
              ? <CheckCircle className="w-7 h-7 text-white" />
              : <XCircle className="w-7 h-7 text-white" />
            }
            <div>
              <p className="font-black text-white text-lg">
                {result.valid ? "✓ Document AUTHENTIQUE" : "✗ Document NON VALIDE"}
              </p>
              <p className="text-white/80 text-xs">
                {result.valid
                  ? "Ce document a été émis officiellement et est valide"
                  : result.revoked
                    ? `Révoqué — ${result.revokedReason ?? "Raison non spécifiée"}`
                    : result.message ?? "Aucun document trouvé avec ce code"
                }
              </p>
            </div>
          </div>

          {/* Certificate details */}
          {result.certificate && (
            <div className="p-6">
              {/* Diploma header */}
              <div className="text-center mb-6 pb-6 border-b border-gray-100">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">{result.certificate.certificate_type}</h2>
                <p className="text-gray-500 text-sm">{result.certificate.school_name}</p>
              </div>

              {/* Details grid */}
              <div className="space-y-3">
                {[
                  { label: "Bénéficiaire", value: result.certificate.full_name, bold: true },
                  { label: "N° Certificat", value: result.certificate.certificate_number, mono: true },
                  { label: "Niveau obtenu", value: result.certificate.level_completed },
                  { label: "Promotion", value: String(result.certificate.graduation_year) },
                  ...(result.certificate.series_or_track ? [{ label: "Série", value: result.certificate.series_or_track }] : []),
                  ...(result.certificate.final_grade ? [{ label: "Note finale", value: result.certificate.final_grade }] : []),
                  ...(result.certificate.mention ? [{ label: "Mention", value: result.certificate.mention }] : []),
                  { label: "Date d'émission", value: fmtDate(result.certificate.issued_date) },
                  ...(result.certificate.director_name ? [{ label: "Directeur de l'établissement", value: result.certificate.director_name }] : []),
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-sm">{row.label}</span>
                    <span className={`text-sm text-right max-w-[55%] ${row.bold ? "font-bold text-gray-800" : "font-medium text-gray-700"} ${row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Verification code */}
              <div className="mt-5 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Code de vérification</p>
                <p className="font-mono text-xs text-gray-600 break-all">{params.code}</p>
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                Vérification effectuée le {fmtDate(new Date())} · Plateforme Edut School Management
              </p>
            </div>
          )}

          {/* Not found */}
          {!result.certificate && (
            <div className="p-8 text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-600 mb-1">Aucun document trouvé</p>
              <p className="text-sm text-gray-400">Le code saisi ne correspond à aucun certificat dans notre base de données.</p>
              <div className="mt-4 bg-amber-50 rounded-xl p-3 text-xs text-amber-700 text-left">
                <p className="font-bold mb-1">Code scanné :</p>
                <p className="font-mono break-all">{params.code}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-violet-400 text-xs mt-6">
          © {new Date().getFullYear()} Edut School Platform · Système anti-fraude certifié
        </p>
      </div>
    </div>
  );
}
