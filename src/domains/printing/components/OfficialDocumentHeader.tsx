"use client";

import Image from "next/image";
import { mergeDocumentHeaderConfig, type DocumentHeaderConfig } from "../document-header";

type OfficialDocumentHeaderProps = {
  config?: Partial<DocumentHeaderConfig> | null;
  title?: string;
  variant?: "full" | "compact";
  className?: string;
};

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
      {lines.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

export default function OfficialDocumentHeader({ config, title, variant = "full", className = "" }: OfficialDocumentHeaderProps) {
  const cfg = mergeDocumentHeaderConfig(config);
  const primary = cfg.primaryColor || "#4f46e5";
  const secondary = cfg.secondaryColor || "#10b981";
  const titleSize = variant === "compact" ? Math.max(18, (cfg.titleSize || 26) - 8) : cfg.titleSize || 26;

  if (cfg.style === "modern_card") {
    return (
      <header className={`official-document-header overflow-hidden rounded-2xl text-white print:rounded-none ${className}`} style={{ background: primary }}>
        <div className="relative flex items-center justify-between gap-6 px-6 py-5">
          <div className="flex items-center gap-4">
            <LogoBox src={cfg.leftLogo || cfg.centerLogo} alt={cfg.schoolName} size={58} />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-80">{cfg.country || "République"}</p>
              <h2 className="text-2xl font-black leading-tight">{cfg.schoolName}</h2>
              <p className="text-xs font-bold text-amber-200">Année Scolaire {cfg.schoolYear}</p>
            </div>
          </div>
          <div className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest" style={{ background: secondary }}>
            {title || "Document officiel"}
          </div>
        </div>
      </header>
    );
  }

  if (cfg.style === "bilingual_center_logo") {
    return (
      <header className={`official-document-header border-b-2 border-slate-900 pb-3 print:border-black ${className}`}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-6">
          <MetaLines cfg={cfg} />
          
          <LogoBox src={cfg.centerLogo || cfg.leftLogo} alt={cfg.schoolName} size={126} />
          
          <div 
            dir="rtl" 
            lang="ar" 
            className="space-y-0.5 text-right text-[11px] font-bold leading-tight text-slate-950 print:text-black arabic-text"
            style={{ fontFamily: '"Noto Naskh Arabic", "Amiri", "Arial", sans-serif' }}
          >
            {cfg.countryAr && <p>{cfg.countryAr}</p>}
            {cfg.ministryAr && <p>{cfg.ministryAr}</p>}
            {cfg.regionalDirectionAr && <p>{cfg.regionalDirectionAr}</p>}
            {cfg.departmentalDirectionAr && <p>{cfg.departmentalDirectionAr}</p>}
            {cfg.inspectionAr && <p>{cfg.inspectionAr}</p>}
            {cfg.schoolNameAr && <p className="text-xs font-black">{cfg.schoolNameAr}</p>}
            {cfg.serviceAr && <p>{cfg.serviceAr}</p>}
            {cfg.addressAr && <p>{cfg.addressAr}</p>}
            {cfg.bp && <p>ص.ب: {cfg.bp}</p>}
            {cfg.phone && <p>الهاتف: {cfg.phone}</p>}
            {cfg.email && <p>البريد: {cfg.email}</p>}
          </div>
        </div>
        {title && <h1 className="mt-3 text-center text-xl font-black uppercase tracking-wide">{title}</h1>}
      </header>
    );
  }

  if (cfg.style === "university_formal") {
    return (
      <header className={`official-document-header text-center ${className}`}>
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
      </header>
    );
  }

  if (cfg.style === "minimal_administrative") {
    return (
      <header className={`official-document-header border-b border-slate-300 pb-3 ${className}`}>
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black uppercase" style={{ color: primary }}>{cfg.schoolName}</h2>
            <MetaLines cfg={cfg} />
          </div>
          <LogoBox src={cfg.centerLogo || cfg.leftLogo} alt={cfg.schoolName} size={72} />
        </div>
        {title && <h1 className="mt-3 text-center text-lg font-black uppercase">{title}</h1>}
      </header>
    );
  }

  return (
    <header className={`official-document-header border-b-2 border-slate-900 pb-3 print:border-black ${className}`}>
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
    </header>
  );
}
