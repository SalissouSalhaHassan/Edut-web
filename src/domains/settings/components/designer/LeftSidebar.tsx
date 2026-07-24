"use client";

import { useState } from "react";
import { ElementType, DYNAMIC_VARIABLES } from "./types";
import {
  Type, Image as ImageIcon, ShieldAlert, Table, QrCode, Barcode,
  Stamp, FileSignature, Square, Circle, Minus, Calendar, Hash, Variable,
  Layers, Search, Plus, Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LeftSidebarProps {
  onAddElement: (type: ElementType, customProps?: any) => void;
}

export default function LeftSidebar({ onAddElement }: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<"library" | "variables">("library");
  const [searchVar, setSearchVar] = useState("");

  const filteredVars = DYNAMIC_VARIABLES.filter(v =>
    v.key.toLowerCase().includes(searchVar.toLowerCase()) ||
    v.label.toLowerCase().includes(searchVar.toLowerCase()) ||
    v.category.toLowerCase().includes(searchVar.toLowerCase())
  );

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full select-none z-20 shadow-sm">
      {/* Header Tabs */}
      <div className="p-4 border-b border-slate-100 flex gap-2">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            activeTab === "library" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Sparkles size={14} /> العناصر
        </button>
        <button
          onClick={() => setActiveTab("variables")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition ${
            activeTab === "variables" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Variable size={14} /> المتغيرات
        </button>
      </div>

      {/* Library View */}
      {activeTab === "library" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Section: Typography */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">النصوص والترويسات</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("text", { content: "عنوان رئيسي كبير", fontSize: 24, fontWeight: "bold" })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <Type size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">عنوان رئيسي</span>
              </button>
              <button
                onClick={() => onAddElement("text", { content: "نص ثانوي فرعي", fontSize: 16, fontWeight: "normal" })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <Type size={18} className="text-slate-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">نص فرعي</span>
              </button>
            </div>
          </div>

          {/* Section: Media & Logos */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">الشعارات والوسائط</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("logo", { src: "/placeholder-logo.png", name: "Logo Officiel" })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <Sparkles size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">شعار رسمى</span>
              </button>
              <button
                onClick={() => onAddElement("image")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <ImageIcon size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">صورة / خلفية</span>
              </button>
            </div>
          </div>

          {/* Section: Shapes */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">الأشكال والأطر</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAddElement("shape", { shapeType: "rectangle" })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 text-slate-700 transition"
              >
                <Square size={18} className="text-slate-600" />
                <span className="text-[11px] font-bold">مستطيل</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "circle" })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 text-slate-700 transition"
              >
                <Circle size={18} className="text-slate-600" />
                <span className="text-[11px] font-bold">دائرة</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "line", height: 2 })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 text-slate-700 transition"
              >
                <Minus size={18} className="text-slate-600" />
                <span className="text-[11px] font-bold">خط فاصل</span>
              </button>
            </div>
          </div>

          {/* Section: Data & Tables */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">الجداول والرموز الأمنية</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("table")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <Table size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">جدول نتائج</span>
              </button>
              <button
                onClick={() => onAddElement("qrcode")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <QrCode size={20} className="text-slate-900 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">رمز QR أمني</span>
              </button>
              <button
                onClick={() => onAddElement("barcode")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <Barcode size={20} className="text-slate-900 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">بارشود Barcode</span>
              </button>
              <button
                onClick={() => onAddElement("stamp")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-xl flex flex-col items-center gap-2 text-slate-700 transition group"
              >
                <Stamp size={20} className="text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">ختم رسمي</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic Variables View */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="البحث عن متغير حاد..."
              value={searchVar}
              onChange={(e) => setSearchVar(e.target.value)}
              className="pl-9 h-10 rounded-xl border-slate-200 text-xs font-bold"
            />
          </div>

          <div className="space-y-2">
            {filteredVars.map((item) => (
              <button
                key={item.key}
                onClick={() => onAddElement("variable", { variableKey: item.key, content: item.key, fontSize: 16, fontWeight: "bold", color: "#312e81" })}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between text-right transition group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">{item.label}</p>
                  <span className="text-[10px] font-mono text-indigo-600">{item.key}</span>
                </div>
                <Plus size={16} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
