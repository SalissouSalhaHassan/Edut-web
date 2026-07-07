"use client";

import Image from "next/image";
import { mergeDocumentHeaderConfig, type DocumentHeaderConfig } from "../document-header";

function LogoBox({ src, alt, size = 86 }: { src?: string; alt: string; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:shadow-none"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-contain p-1" unoptimized />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase text-slate-300">
          Logo
        </div>
      )}
    </div>
  );
}

const mojibakeArabicMap: Record<string, string> = {
  "ط¬ظ…ظ‡ظˆط±ظٹط© ط§ظ„ظ†ظٹط¬ط±": "جمهورية النيجر",
  "ظˆط²ط§ط±ط© ط§ظ„طھط±ط¨ظٹط© ط§ظ„ظˆط·ظ†ظٹط©": "وزارة التربية الوطنية",
  "ط§ظ„ظ…ط¯ظٹط±ظٹط© ط§ظ„ط¬ظ‡ظˆظٹط© ظ„ظ„طھط±ط¨ظٹط© ط§ظ„ظˆط·ظ†ظٹط©": "المديرية الجهوية للتربية الوطنية",
  "ط§ظ„ظ…ط¯ظٹط±ظٹط© ط§ظ„ط¥ظ‚ظ„ظٹظ…ظٹط© ظ„ظ„طھط±ط¨ظٹط© ط§ظ„ظˆط·ظ†ظٹط©": "المديرية الإقليمية للتربية الوطنية",
  "ظ…ظپطھط´ظٹط© ط§ظ„طھط±ط¨ظٹط© ط§ظ„ظˆط·ظ†ظٹط©": "مفتشية التربية الوطنية",
  "ظ…طµظ„ط­ط© ط´ط¤ظˆظ† ط§ظ„ط·ظ„ط§ط¨": "مصلحة شؤون الطلاب",
  "ظ…ط¯ط±ط³ط© ط§ظ„طھظ…ظٹط²": "مدرسة التميز",
};

function cleanHeaderText(value?: string | null) {
  if (!value) return "";
  return Object.entries(mojibakeArabicMap).reduce(
    (text, [broken, fixed]) => text.split(broken).join(fixed),
    value,
  );
}

function MetaLines({ cfg, align = "left" }: { cfg: DocumentHeaderConfig; align?: "left" | "right" | "center" }) {
  const lines = [
    cfg.country,
    cfg.ministry,
    cfg.regionalDirection,
    cfg.departmentalDirection,
    cfg.inspection,
    cfg.service,
    cfg.address,
    cfg.bp ? `BP : ${cfg.bp}` : "",
    cfg.phone ? `Tél. : ${cfg.phone}` : "",
    cfg.email ? `Email : ${cfg.email}` : "",
  ].filter(Boolean);

  return (
    <div dir="ltr" lang="fr" className={`space-y-0.5 text-${align} text-[11px] font-bold leading-tight text-slate-950 print:text-black french-text`}>
      {lines.map((line) => <p key={line}>{cleanHeaderText(line)}</p>)}
    </div>
  );
}

function ArabicMetaLines({ cfg }: { cfg: DocumentHeaderConfig }) {
  const schoolNameAr = cleanHeaderText(cfg.schoolNameAr);
  const lines = [
    cfg.countryAr,
    cfg.ministryAr,
    cfg.regionalDirectionAr,
    cfg.departmentalDirectionAr,
    cfg.inspectionAr,
    schoolNameAr,
    cfg.serviceAr,
    cfg.addressAr,
    cfg.bp ? `ص.ب: ${cfg.bp}` : "",
    cfg.phone ? `الهاتف: ${cfg.phone}` : "",
    cfg.email ? `البريد: ${cfg.email}` : "",
  ].map(cleanHeaderText).filter(Boolean);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="arabic-text space-y-1 text-right text-[12px] font-bold leading-relaxed text-slate-950 print:text-black"
    >
      {lines.map((line, index) => (
        <p key={`${line}-${index}`} className={line === schoolNameAr ? "text-[13px] font-black" : undefined}>
          {line}
        </p>
      ))}
    </div>
  );
}

type OfficialDocumentHeaderProps = {
  config?: Partial<DocumentHeaderConfig> | null;
  title?: string;
  variant?: "full" | "compact";
  className?: string;
  operatorName?: string;
  printDate?: string;
  qrData?: string;
  showSignatureArea?: boolean;
};

export default function OfficialDocumentHeader({
  config,
  title,
  variant = "full",
  className = "",
  operatorName,
  printDate,
  qrData,
  showSignatureArea,
}: OfficialDocumentHeaderProps) {
  const cfg = mergeDocumentHeaderConfig(config);
  const primary = cfg.primaryColor || "#4f46e5";
  const secondary = cfg.secondaryColor || "#10b981";
  const titleSize = variant === "compact" ? Math.max(18, (cfg.titleSize || 26) - 8) : cfg.titleSize || 26;

  const metaFooter = (printDate || operatorName) && (
    <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-bold">
      {printDate && <p>Imprimé le : {printDate}</p>}
      {operatorName && <p>Opérateur : {operatorName}</p>}
    </div>
  );

  const qrSection = qrData && (
    <div className="absolute top-5 right-5 print:top-4 print:right-4 z-10 flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-150 shadow-sm print:shadow-none">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(qrData)}`}
        alt="Vérification QR"
        className="w-14 h-14"
      />
      <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Vérification</span>
    </div>
  );

  const sigArea = showSignatureArea && (
    <div className="mt-8 grid grid-cols-2 gap-8 print:mt-6">
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center print:border-black print:border">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cachet de l'établissement</p>
        <div className="h-16 flex items-center justify-center text-[10px] italic text-slate-300">Emplacement cachet</div>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center print:border-black print:border">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature autorisée</p>
        <div className="h-16 flex items-center justify-center text-[10px] italic text-slate-300">Emplacement signature</div>
      </div>
    </div>
  );

  if (cfg.style === "modern_card") {
    return (
      <header className={`official-document-header relative overflow-hidden rounded-2xl text-white print:rounded-none ${className}`} style={{ background: primary }}>
        <div className="relative flex items-center justify-between gap-6 px-6 py-5">
          <div className="flex items-center gap-4">
            <LogoBox src={cfg.leftLogo || cfg.centerLogo} alt={cfg.schoolName} size={58} />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-80">{cfg.country || "République"}</p>
              <h2 className="text-2xl font-black leading-tight">{cfg.schoolName}</h2>
              <p className="text-xs font-bold text-amber-200">Année Scolaire {cfg.schoolYear}</p>
              {(printDate || operatorName) && (
                <p className="text-[9px] opacity-75 mt-1 font-bold">
                  {printDate && `Le ${printDate}`} {operatorName && `| Par ${operatorName}`}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest" style={{ background: secondary }}>
            {title || "Document officiel"}
          </div>
        </div>
        {sigArea}
      </header>
    );
  }

  if (cfg.style === "bilingual_center_logo") {
    return (
      <header className={`official-document-header relative border-b-2 border-slate-900 pb-3 print:border-black ${className}`}>
        {qrSection}
        <div className="official-document-header-grid grid grid-cols-[1fr_auto_1fr] items-start gap-6">
          <MetaLines cfg={cfg} />
          
          <LogoBox src={cfg.centerLogo || cfg.leftLogo} alt={cfg.schoolName} size={126} />
          
          <ArabicMetaLines cfg={cfg} />
        </div>
        {title && <h1 className="mt-3 text-center text-xl font-black uppercase tracking-wide">{title}</h1>}
        {metaFooter}
        {sigArea}
      </header>
    );
  }

  if (cfg.style === "university_formal") {
    return (
      <header className={`official-document-header relative text-center ${className}`}>
        {qrSection}
        <div className="grid grid-cols-[110px_1fr_110px] items-center gap-5">
          <LogoBox src={cfg.leftLogo || cfg.centerLogo} alt={cfg.schoolName} size={104} />
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-wide">{cfg.country || "République du Niger"}</h2>
            <p className="text-xl font-black">{cfg.schoolName}</p>
            <div className="border-y py-1" style={{ borderColor: secondary }}>
              <p className="text-sm font-black">{cfg.service || "Service de la Scolarité"}</p>
            </div>
            <p className="text-sm font-bold">{[cfg.bp && `BP : ${cfg.bp}`, cfg.address, cfg.phone && `Tél. ${cfg.phone}`].filter(Boolean).join(", ")}</p>
            {cfg.email && <p className="text-sm font-bold">Email : {cfg.email}</p>}
            {cfg.authorizationText && <p className="text-sm font-black uppercase">{cfg.authorizationText}</p>}
          </div>
          <LogoBox src={cfg.rightLogo || cfg.leftLogo || cfg.centerLogo} alt={cfg.schoolName} size={104} />
        </div>
        {title && <h1 className="mt-3 text-lg font-black uppercase">{title}</h1>}
        {metaFooter}
        {sigArea}
      </header>
    );
  }

  if (cfg.style === "minimal_administrative") {
    return (
      <header className={`official-document-header relative border-b border-slate-300 pb-3 ${className}`}>
        {qrSection}
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black uppercase" style={{ color: primary }}>{cfg.schoolName}</h2>
            <MetaLines cfg={cfg} />
          </div>
          <LogoBox src={cfg.centerLogo || cfg.leftLogo} alt={cfg.schoolName} size={72} />
        </div>
        {title && <h1 className="mt-3 text-center text-lg font-black uppercase">{title}</h1>}
        {metaFooter}
        {sigArea}
      </header>
    );
  }

  return (
    <header className={`official-document-header relative border-b-2 border-slate-900 pb-3 print:border-black ${className}`}>
      {qrSection}
      <div className="grid grid-cols-[120px_1fr_120px] items-center gap-6 text-center">
        <LogoBox src={cfg.leftLogo || cfg.centerLogo} alt={cfg.schoolName} size={104} />
        <div>
          <h2
            className="font-black uppercase tracking-wide text-slate-950 print:text-black"
            style={{ fontFamily: cfg.titleFont || "serif", fontSize: titleSize }}
          >
            {cfg.schoolName}
          </h2>
          {cfg.motto && <p className="mt-1 text-xs font-bold text-slate-500">{cfg.motto}</p>}
        </div>
        <LogoBox src={cfg.rightLogo || cfg.leftLogo || cfg.centerLogo} alt={cfg.schoolName} size={104} />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_220px] gap-4 border-t border-slate-300 pt-3">
        <MetaLines cfg={cfg} />
        <div className="text-center text-sm font-black">
          <p>ANNÉE SCOLAIRE : {cfg.schoolYear || "-"}</p>
          {title && <p className="mt-2 uppercase">{title}</p>}
        </div>
      </div>
      {metaFooter}
      {sigArea}
    </header>
  );
}
