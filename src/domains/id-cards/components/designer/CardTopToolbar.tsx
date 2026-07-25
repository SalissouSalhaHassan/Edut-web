"use client";

import { useRef } from "react";
import { CardSize, Orientation, CardSide } from "./types";
import { Undo, Redo, ZoomIn, ZoomOut, Download, Upload, Save, Printer, IdCard, Sparkles, Grid, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CardTopToolbarProps {
  cardType: CardSize;
  onCardTypeChange: (size: CardSize) => void;
  orientation: Orientation;
  onOrientationChange: (orientation: Orientation) => void;
  activeSide: CardSide;
  onSideChange: (side: CardSide) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: "pdf" | "png" | "jpeg" | "json") => void;
  onImportJSON: (json: any) => void;
  onSave: () => void;
  saving?: boolean;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onBatchPrintClick: () => void;
}

export default function CardTopToolbar({
  cardType,
  onCardTypeChange,
  orientation,
  onOrientationChange,
  activeSide,
  onSideChange,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onImportJSON,
  onSave,
  saving,
  templateName,
  onTemplateNameChange,
  onBatchPrintClick,
}: CardTopToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportJSON(json);
      } catch (err) {
        alert("JSON غير صالح");
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-sm select-none">
      {/* Template Name & Side Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100">
            <IdCard size={20} />
          </div>
          <div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              className="text-sm font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none transition px-1"
              placeholder="اسم قالب البطاقات..."
            />
            <p className="text-[10px] font-semibold text-slate-400 px-1">Professional Card Studio (WYSIWYG)</p>
          </div>
        </div>

        {/* Recto / Verso Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onSideChange("recto")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              activeSide === "recto" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            الواجهة الأولي (Recto)
          </button>
          <button
            onClick={() => onSideChange("verso")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
              activeSide === "verso" ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            الظهر (Verso)
          </button>
        </div>
      </div>

      {/* Card Configuration & Controls */}
      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
        <Select value={cardType} onValueChange={(v) => onCardTypeChange(v as CardSize)}>
          <SelectTrigger className="h-8 w-28 rounded-xl border-none bg-white font-bold text-xs shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CR80">CR80 (PVC)</SelectItem>
            <SelectItem value="CR100">CR100 (كبير)</SelectItem>
            <SelectItem value="Badge">Badge (90x60)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orientation} onValueChange={(v) => onOrientationChange(v as Orientation)}>
          <SelectTrigger className="h-8 w-28 rounded-xl border-none bg-white font-bold text-xs shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="landscape">أفقي Landscape</SelectItem>
            <SelectItem value="portrait">عمودي Portrait</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <Button size="icon" variant="ghost" disabled={!canUndo} onClick={onUndo} className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white" title="تراجع (Ctrl+Z)">
          <Undo size={14} />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canRedo} onClick={onRedo} className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white" title="إعادة (Ctrl+Y)">
          <Redo size={14} />
        </Button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => onZoomChange(Math.max(25, zoom - 25))} className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white">
            <ZoomOut size={14} />
          </Button>
          <span className="text-xs font-mono font-bold text-slate-700 w-10 text-center">{zoom}%</span>
          <Button size="icon" variant="ghost" onClick={() => onZoomChange(Math.min(200, zoom + 25))} className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white">
            <ZoomIn size={14} />
          </Button>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <Button size="icon" variant="ghost" onClick={onToggleGrid} className={`h-8 w-8 rounded-xl ${showGrid ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-white"}`} title="Grid">
          <Grid size={14} />
        </Button>
      </div>

      {/* Export & Actions */}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />

        <Button onClick={onBatchPrintClick} className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5">
          <Printer size={14} /> طباعة البطاقات للطلاب
        </Button>

        <Select onValueChange={(fmt) => onExport(fmt as any)}>
          <SelectTrigger className="h-9 w-28 rounded-xl border-slate-200 bg-white font-bold text-xs shadow-sm">
            <Download size={13} className="mr-1 text-slate-500" />
            <SelectValue placeholder="تصدير" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">تصدير PDF</SelectItem>
            <SelectItem value="png">تصدير PNG</SelectItem>
            <SelectItem value="jpeg">تصدير JPEG</SelectItem>
            <SelectItem value="json">تصدير JSON</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onSave} disabled={saving} className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 flex items-center gap-1.5">
          <Save size={14} /> {saving ? "جاري الحفظ..." : "حفظ القالب"}
        </Button>
      </div>
    </header>
  );
}
