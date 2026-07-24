"use client";

import { useRef } from "react";
import { PageSize, Orientation } from "./types";
import {
  Undo, Redo, ZoomIn, ZoomOut, Download, Upload, Save,
  FileText, Image as ImageIcon, Grid, Ruler, Sparkles, Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TopToolbarProps {
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  orientation: Orientation;
  onOrientationChange: (orientation: Orientation) => void;
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
  onExport: (format: "pdf" | "png" | "jpeg" | "svg" | "json") => void;
  onImportJSON: (json: any) => void;
  onSave: () => void;
  saving?: boolean;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
}

export default function TopToolbar({
  pageSize,
  onPageSizeChange,
  orientation,
  onOrientationChange,
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
}: TopToolbarProps) {
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
        alert("تنسيق JSON غير صالح");
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-sm select-none">
      {/* Template Name & Presets */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-100">
          <Layout size={20} />
        </div>
        <div>
          <input
            type="text"
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            className="text-base font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none transition px-1"
            placeholder="اسم القالب الرسمي..."
          />
          <p className="text-[10px] font-semibold text-slate-400 px-1">محرر الترويسات والمستندات WYSIWYG</p>
        </div>
      </div>

      {/* Page Configuration & Zoom Controls */}
      <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
        {/* Page Size */}
        <Select value={pageSize} onValueChange={(v) => onPageSizeChange(v as PageSize)}>
          <SelectTrigger className="h-9 w-24 rounded-xl border-none bg-white font-bold text-xs shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A4">A4</SelectItem>
            <SelectItem value="A5">A5</SelectItem>
            <SelectItem value="Letter">Letter</SelectItem>
            <SelectItem value="Legal">Legal</SelectItem>
          </SelectContent>
        </Select>

        {/* Orientation */}
        <Select value={orientation} onValueChange={(v) => onOrientationChange(v as Orientation)}>
          <SelectTrigger className="h-9 w-28 rounded-xl border-none bg-white font-bold text-xs shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">عمودي (Portrait)</SelectItem>
            <SelectItem value="landscape">أفقي (Landscape)</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Undo / Redo */}
        <Button
          size="icon"
          variant="ghost"
          disabled={!canUndo}
          onClick={onUndo}
          className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white"
          title="تراجع (Ctrl+Z)"
        >
          <Undo size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={!canRedo}
          onClick={onRedo}
          className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white"
          title="إعادة (Ctrl+Y)"
        >
          <Redo size={14} />
        </Button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onZoomChange(Math.max(25, zoom - 25))}
            className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white"
          >
            <ZoomOut size={14} />
          </Button>
          <span className="text-xs font-mono font-bold text-slate-700 w-10 text-center">{zoom}%</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onZoomChange(Math.min(200, zoom + 25))}
            className="h-8 w-8 rounded-xl text-slate-700 hover:bg-white"
          >
            <ZoomIn size={14} />
          </Button>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Rulers & Grid Toggles */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleGrid}
          className={`h-8 w-8 rounded-xl ${showGrid ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-white"}`}
          title="شبكة المحاذاة Grid"
        >
          <Grid size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleRulers}
          className={`h-8 w-8 rounded-xl ${showRulers ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-white"}`}
          title="المسطرة Rulers"
        >
          <Ruler size={14} />
        </Button>
      </div>

      {/* Export & Save Hub */}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border-slate-200 font-bold text-xs h-10"
        >
          <Upload size={14} className="mr-1.5 text-slate-500" /> استيراد JSON
        </Button>

        <Select onValueChange={(fmt) => onExport(fmt as any)}>
          <SelectTrigger className="h-10 w-32 rounded-xl border-slate-200 bg-white font-bold text-xs shadow-sm">
            <Download size={14} className="mr-1 text-slate-500" />
            <SelectValue placeholder="تصدير" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">تصدير PDF</SelectItem>
            <SelectItem value="png">تصدير PNG</SelectItem>
            <SelectItem value="jpeg">تصدير JPEG</SelectItem>
            <SelectItem value="json">تصدير JSON</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onSave}
          disabled={saving}
          className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? "جاري الحفظ..." : "حفظ القالب"}
        </Button>
      </div>
    </header>
  );
}
