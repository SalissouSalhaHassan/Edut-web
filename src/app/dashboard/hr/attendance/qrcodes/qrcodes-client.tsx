"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { 
  Printer, Download, Search, ArrowLeft, Grid, LayoutGrid, FileText, CheckCircle 
} from "lucide-react";

interface ClassroomQRCodesProps {
  classes: any[];
  schoolName: string;
}

export default function ClassroomQRCodes({ classes, schoolName }: ClassroomQRCodesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Filter classes by name or section
  const filteredClasses = classes.filter((c) =>
    c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.section?.sectionName && c.section.sectionName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getQRValue = (classId: number) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/dashboard/hr/attendance/scan?classId=${classId}`;
    }
    return `https://edut.pro/dashboard/hr/attendance/scan?classId=${classId}`;
  };

  const handleDownload = (classId: number, className: string) => {
    const svg = document.getElementById(`qr-svg-${classId}`);
    if (!svg) return;

    const svgString = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, 300, 300);
        context.drawImage(image, 10, 10, 280, 280);
        
        const png = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = png;
        downloadLink.download = `QR_CODE_${className.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

  const triggerPrintAll = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 space-y-8 print:p-0 print:bg-white">
      {/* Print-only CSS stylesheet */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, aside, header, footer, button, .no-print, input, .breadcrumbs {
            display: none !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
            page-break-inside: auto !important;
          }
          .print-card {
            border: 2px dashed #cbd5e1 !important;
            border-radius: 16px !important;
            padding: 24px !important;
            text-align: center !important;
            page-break-inside: avoid !important;
            background-color: white !important;
            box-shadow: none !important;
            margin-bottom: 20px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            height: 380px !important;
          }
          .print-card h2 {
            font-size: 20px !important;
            font-weight: 900 !important;
            margin-top: 10px !important;
            text-transform: uppercase !important;
          }
          .print-card p {
            font-size: 11px !important;
            color: #64748b !important;
            margin-bottom: 15px !important;
          }
        }
      `}</style>

      {/* Header (Hidden in Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="space-y-2">
          <Link 
            href="/dashboard/hr" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors breadcrumbs"
          >
            <ArrowLeft size={14} /> Retour à l'Annuaire
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">QR Codes des Salles de Classe</h1>
            <span className="text-xl font-bold text-slate-400 font-arabic">رموز الاستجابة السريعة للفصول</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Générez et imprimez les QR codes à suspendre dans chaque salle pour la présence des enseignants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerPrintAll}
            className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all text-sm"
          >
            <Printer size={16} /> Imprimer Tous les QR Codes
          </button>
        </div>
      </div>

      {/* Info Card (Hidden in Print) */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="space-y-2 max-w-xl">
          <h3 className="text-lg font-black uppercase tracking-wider">Instructions pour l'affichage</h3>
          <p className="text-xs text-indigo-100 leading-relaxed font-semibold">
            Chaque QR Code ci-dessous correspond à une classe spécifique. Imprimez-les, plastifiez-les et suspendez-les à l'entrée de chaque salle de classe. L'enseignant pourra simplement scanner le code avec son appareil mobile dès son arrivée pour valider son heure de présence.
          </p>
        </div>
        <div className="bg-white/10 px-4 py-3 rounded-2xl border border-white/20 text-xs font-bold flex items-center gap-2 shrink-0">
          <CheckCircle size={16} className="text-emerald-300" />
          <span>Origin URL: {typeof window !== "undefined" ? window.location.origin : ""}</span>
        </div>
      </div>

      {/* Search Filter (Hidden in Print) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <form className="relative w-full md:w-[450px]" onSubmit={(e) => e.preventDefault()}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            placeholder="Rechercher une classe (ex: Terminale, 6ème)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none text-sm font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </form>
        <div className="text-xs font-bold text-slate-500">
          {filteredClasses.length} classe(s) disponible(s)
        </div>
      </div>

      {/* QR Codes Grid Area (Visible in print too) */}
      <div className="print-area">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print-grid">
          {filteredClasses.map((cls) => {
            const qrVal = getQRValue(cls.id);
            return (
              <div 
                key={cls.id} 
                className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-xl shadow-slate-100/40 flex flex-col items-center text-center transition-all hover:shadow-2xl hover:shadow-slate-200/50 relative overflow-hidden group print-card"
              >
                {/* Header Badge */}
                <div className="w-full bg-slate-50/50 py-2.5 rounded-2xl border border-slate-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 no-print">
                  {cls.section?.sectionName || "Scolarité"}
                </div>

                {/* School Name in QR Card */}
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {schoolName}
                </h4>
                
                {/* Classroom Name */}
                <h2 className="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">
                  {cls.className}
                </h2>

                {/* QR Code Graphic */}
                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100/50 mb-4 flex items-center justify-center">
                  <QRCodeSVG
                    id={`qr-svg-${cls.id}`}
                    value={qrVal}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Footer Label */}
                <p className="text-[10px] font-bold text-slate-400 tracking-wide mb-6">
                  SCANNER POUR ENREGISTRER VOTRE PRÉSENCE
                </p>

                {/* Actions (Hidden in Print) */}
                <div className="flex items-center gap-2 w-full mt-auto no-print pt-2 border-t border-slate-50">
                  <button
                    onClick={() => handleDownload(cls.id, cls.className)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download size={13} />
                    Télécharger
                  </button>
                  <button
                    onClick={() => {
                      // print this card only
                      const printContents = document.getElementById(`qr-svg-${cls.id}`)?.outerHTML;
                      const originalContents = document.body.innerHTML;
                      
                      // Small custom iframe or print win for individual class printing
                      const printWin = window.open("", "_blank");
                      if (printWin) {
                        printWin.document.write(`
                          <html>
                            <head>
                              <title>QR Code - ${cls.className}</title>
                              <style>
                                body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; margin: 0; }
                                h1 { font-size: 32px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; }
                                p { font-size: 14px; color: #64748b; margin-top: 5px; margin-bottom: 20px; }
                              </style>
                            </head>
                            <body onload="window.print();window.close();">
                              <h3 style="text-transform: uppercase; font-size: 12px; color: #94a3b8; font-weight: 800; letter-spacing: 2px;">${schoolName}</h3>
                              <h1>${cls.className}</h1>
                              <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 20px;">
                                ${printContents}
                              </div>
                              <p style="font-weight: bold; letter-spacing: 1px; font-size: 11px; margin-top: 25px;">SCANNER POUR LA PRÉSENCE ENSEIGNANT</p>
                            </body>
                          </html>
                        `);
                        printWin.document.close();
                      }
                    }}
                    className="h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors"
                    title="Imprimer cette fiche"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
