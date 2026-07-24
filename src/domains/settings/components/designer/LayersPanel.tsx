"use client";

import { DesignerElement } from "./types";
import {
  Layers, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  Lock, Eye, EyeOff, Trash2, Copy, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayersPanelProps {
  elements: DesignerElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onToggleLock: (id: string) => void;
  onToggleHide: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function LayersPanel({
  elements,
  selectedId,
  onSelect,
  onMoveLayer,
  onToggleLock,
  onToggleHide,
  onDuplicate,
  onDelete,
}: LayersPanelProps) {
  // Sort elements by Z-index descending (top-most layer on top of list)
  const sortedLayers = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="bg-white border-t border-slate-200 p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-indigo-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">إدارة الطبقات (Layers)</h4>
          <span className="text-[10px] font-bold text-slate-400">({elements.length})</span>
        </div>

        {selectedId && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveLayer(selectedId, "top")}
              className="h-7 w-7 rounded-lg text-slate-600 hover:text-indigo-600"
              title="جلب للأمام كلياً"
            >
              <ArrowUpToLine size={12} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveLayer(selectedId, "up")}
              className="h-7 w-7 rounded-lg text-slate-600 hover:text-indigo-600"
              title="تقديم خطوة"
            >
              <ArrowUp size={12} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveLayer(selectedId, "down")}
              className="h-7 w-7 rounded-lg text-slate-600 hover:text-indigo-600"
              title="تأخير خطوة"
            >
              <ArrowDown size={12} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMoveLayer(selectedId, "bottom")}
              className="h-7 w-7 rounded-lg text-slate-600 hover:text-indigo-600"
              title="إرسال للخلف كلياً"
            >
              <ArrowDownToLine size={12} />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {sortedLayers.map((el) => {
          const isSelected = el.id === selectedId;

          return (
            <div
              key={el.id}
              onClick={() => onSelect(el.id)}
              className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                isSelected ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold" : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-[10px] font-mono text-slate-400">z:{el.zIndex}</span>
                <span className="text-xs truncate">{el.name}</span>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onToggleLock(el.id)}
                  className={`p-1 rounded hover:bg-white transition ${el.locked ? "text-amber-600" : "text-slate-400"}`}
                  title="تأمين"
                >
                  <Lock size={12} />
                </button>
                <button
                  onClick={() => onToggleHide(el.id)}
                  className={`p-1 rounded hover:bg-white transition ${el.hidden ? "text-rose-600" : "text-slate-400"}`}
                  title="إخفاء"
                >
                  {el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  onClick={() => onDuplicate(el.id)}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition"
                  title="تكرار"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => onDelete(el.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white transition"
                  title="حذف"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
