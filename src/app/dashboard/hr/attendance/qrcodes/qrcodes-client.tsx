"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { 
  Printer, Download, Search, ArrowLeft, Grid, LayoutGrid, FileText, CheckCircle, Clock, User, BookOpen, Sparkles
} from "lucide-react";

interface ClassroomQRCodesProps {
  classes: any[];
  schoolName: string;
}

export default function ClassroomQRCodes({ classes, schoolName }: ClassroomQRCodesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every 30 seconds to refresh session status dynamically
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter classes by name or section
  const filteredClasses = classes.filter((c) =>
    c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.section?.sectionName && c.section.sectionName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Smart Timetable Session Logic
  const getActiveSessionForClass = (timetableEntries: any[] = []) => {
    const daysMap = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const todayDayName = daysMap[currentTime.getDay()];

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    // Filter entries for today
    const todayEntries = (timetableEntries || []).filter((e) => {
      const dName = (e.dayName || e.day_name || "").trim();
      return dName.toLowerCase() === todayDayName.toLowerCase();
    });

    if (todayEntries.length === 0) {
      return { 
        status: "none", 
        message: "Aucun cours aujourd'hui", 
        session: null 
      };
    }

    // Find currently active session
    for (const entry of todayEntries) {
      const startTimeStr = entry.startTime || entry.start_time || "08:00";
      const endTimeStr = entry.endTime || entry.end_time || "09:30";

      const [sH, sM] = startTimeStr.split(":").map(Number);
      const [eH, eM] = endTimeStr.split(":").map(Number);

      const startMin = (sH || 0) * 60 + (sM || 0);
      const endMin = (eH || 0) * 60 + (eM || 0);

      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        const teacher = entry.employeeNom 
          ? `${entry.employeePrenom || ''} ${entry.employeeNom}` 
          : (entry.employee_nom ? `${entry.employee_prenom || ''} ${entry.employee_nom}` : "Professeur N/A");
        const subject = entry.subjectName || entry.subject_name || "Matière N/A";

        return {
          status: "active",
          message: "SÉANCE EN COURS",
          session: entry,
          startTime: startTimeStr,
          endTime: endTimeStr,
          teacherName: teacher,
          subjectName: subject
        };
      }
    }

    // Find next upcoming session today
    const upcomingEntries = todayEntries.filter((e) => {
      const startTimeStr = e.startTime || e.start_time || "08:00";
      const [sH, sM] = startTimeStr.split(":").map(Number);
      const startMin = (sH || 0) * 60 + (sM || 0);
      return startMin > currentMinutes;
    });

    if (upcomingEntries.length > 0) {
      const nextEntry = upcomingEntries[0];
      const teacher = nextEntry.employeeNom 
        ? `${nextEntry.employeePrenom || ''} ${nextEntry.employeeNom}` 
        : (nextEntry.employee_nom ? `${nextEntry.employee_prenom || ''} ${nextEntry.employee_nom}` : "Professeur N/A");
      const subject = nextEntry.subjectName || nextEntry.subject_name || "Matière N/A";

      return {
        status: "upcoming",
        message: "PROCHAINE SÉANCE",
        session: nextEntry,
        startTime: nextEntry.startTime || nextEntry.start_time || "08:00",
        endTime: nextEntry.endTime || nextEntry.end_time || "09:30",
        teacherName: teacher,
        subjectName: subject
      };
    }

    return { status: "ended", message: "Fin des cours du jour", session: null };
  };

  const getQRValue = (classId: number, sessionId?: number, employeeId?: number) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://edut.pro";
    let url = `${baseUrl}/dashboard/hr/attendance/scan?classId=${classId}`;
    if (sessionId) url += `&sessionId=${sessionId}`;
    if (employeeId) url += `&teacherId=${employeeId}`;
    return url;
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
      {/* Print-only stylesheet */}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-[#131622]/90 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm no-print">
        <div className="space-y-1">
          <Link 
            href="/dashboard/hr" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors breadcrumbs mb-1 block"
          >
            <ArrowLeft size={14} /> Retour à l'Annuaire
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">QR Codes des Salles de Classe</h1>
            <span className="text-lg font-bold text-slate-400 font-arabic">رموز الاستجابة السريعة للفصول</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
            Générez et imprimez les QR codes à suspendre dans chaque salle pour la présence des enseignants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerPrintAll}
            className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all"
          >
            <Printer size={16} /> Imprimer Tous les QR Codes
          </button>
        </div>
      </div>

      {/* Info Card (Hidden in Print) */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="space-y-2 max-w-xl">
          <h3 className="text-base font-black uppercase tracking-wider">Instructions pour l'affichage</h3>
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
      <div className="bg-white dark:bg-[#131622]/90 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <form className="relative w-full md:w-[450px]" onSubmit={(e) => e.preventDefault()}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            placeholder="Rechercher une classe (ex: Terminale, 6ème)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none text-xs font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
          />
        </form>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {filteredClasses.length} classe(s) disponible(s)
        </div>
      </div>

      {/* QR Codes Grid Area (Visible in print too) */}
      <div className="print-area">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print-grid">
          {filteredClasses.map((cls) => {
            const sessionInfo = getActiveSessionForClass(cls.timetableEntries);
            const qrVal = getQRValue(cls.id, sessionInfo.session?.id, sessionInfo.session?.employeeId);

            return (
              <div 
                key={cls.id} 
                className="bg-white dark:bg-[#131622]/90 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-lg dark:hover:shadow-slate-900 relative overflow-hidden group print-card"
              >
                {/* Dynamic Session Status Badge */}
                <div className={`w-full py-2 rounded-2xl border text-[10px] font-black uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5 no-print ${
                  sessionInfo.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 animate-pulse" :
                  sessionInfo.status === "upcoming" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50" :
                  "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    sessionInfo.status === "active" ? "bg-emerald-500" :
                    sessionInfo.status === "upcoming" ? "bg-amber-500" :
                    "bg-slate-400"
                  }`} />
                  {sessionInfo.message}
                </div>

                {/* School Name in QR Card */}
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                  {schoolName}
                </h4>
                
                {/* Classroom Name */}
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3 uppercase">
                  {cls.className}
                </h2>

                {/* Dynamic Teacher & Subject Box (if active or upcoming) */}
                {(sessionInfo.status === "active" || sessionInfo.status === "upcoming") && (
                  <div className="w-full bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-2xl mb-4 text-left space-y-1.5 no-print">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-extrabold text-xs">
                      <User size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{sessionInfo.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                      <BookOpen size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{sessionInfo.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
                      <Clock size={12} className="text-indigo-400 shrink-0" />
                      <span>{sessionInfo.startTime} - {sessionInfo.endTime}</span>
                    </div>
                  </div>
                )}

                {/* QR Code Graphic */}
                <div className="p-4 bg-white dark:bg-white rounded-3xl border border-slate-100 dark:border-slate-800 mb-3 flex items-center justify-center shadow-inner">
                  <QRCodeSVG
                    id={`qr-svg-${cls.id}`}
                    value={qrVal}
                    size={150}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Footer Label */}
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-4 uppercase">
                  Scanner pour présence enseignant
                </p>

                {/* Actions (Hidden in Print) */}
                <div className="flex items-center gap-2 w-full mt-auto no-print pt-2 border-t border-slate-50 dark:border-slate-800">
                  <button
                    onClick={() => handleDownload(cls.id, cls.className)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download size={13} />
                    Télécharger
                  </button>
                  <button
                    onClick={() => {
                      const printContents = document.getElementById(`qr-svg-${cls.id}`)?.outerHTML;
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
                    className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 transition-colors"
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
