"use client";

import { useState } from "react";
import { CardElementType, DYNAMIC_CARD_FIELDS } from "./types";
import {
  Type, UserCheck, Sparkles, Image as ImageIcon, QrCode, Barcode,
  Stamp, Square, Circle, Minus, Plus, Search, Variable,
  Phone, Mail, MapPin, Building2, Calendar, User, ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface CardLeftSidebarProps {
  onAddElement: (type: CardElementType, customProps?: any) => void;
}

export default function CardLeftSidebar({ onAddElement }: CardLeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<"library" | "tokens" | "icons">("library");
  const [searchToken, setSearchToken] = useState("");

  const filteredTokens = DYNAMIC_CARD_FIELDS.filter(t =>
    t.key.toLowerCase().includes(searchToken.toLowerCase()) ||
    t.label.toLowerCase().includes(searchToken.toLowerCase()) ||
    t.category.toLowerCase().includes(searchToken.toLowerCase())
  );

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full select-none z-20 shadow-sm">
      {/* Header Tabs */}
      <div className="p-3 border-b border-slate-100 flex gap-1.5 bg-slate-50/50">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            activeTab === "library" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles size={13} /> Éléments
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            activeTab === "tokens" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Variable size={13} /> Variables
        </button>
        <button
          onClick={() => setActiveTab("icons")}
          className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
            activeTab === "icons" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <User size={13} /> Icônes
        </button>
      </div>

      {/* Main Library Elements */}
      {activeTab === "library" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Section: Photos & Logos */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Photos & Logos</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("studentPhoto")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <UserCheck size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Photo d'élève</span>
              </button>
              <button
                onClick={() => onAddElement("schoolLogo")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <Sparkles size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Logo école</span>
              </button>
            </div>
          </div>

          {/* Section: Text */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Titres & Textes</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("text", { content: "Titre de la carte", fontSize: 16, fontWeight: "bold", color: "#312e81" })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <Type size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Titre principal</span>
              </button>
              <button
                onClick={() => onAddElement("text", { content: "Texte secondaire", fontSize: 11 })}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <Type size={16} className="text-slate-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Texte secondaire</span>
              </button>
            </div>
          </div>

          {/* Section: Barcode & Security */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Codes & Sécurité</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddElement("qrcode")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <QrCode size={20} className="text-slate-900 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Code QR Sécurité</span>
              </button>
              <button
                onClick={() => onAddElement("barcode")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <Barcode size={20} className="text-slate-900 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Code-barres Code128</span>
              </button>
              <button
                onClick={() => onAddElement("stamp")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <Stamp size={20} className="text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Cachet officiel</span>
              </button>
              <button
                onClick={() => onAddElement("signature")}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl flex flex-col items-center gap-2 text-slate-800 transition group"
              >
                <ShieldCheck size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Signature direction</span>
              </button>
            </div>
          </div>

          {/* Section: Shapes */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Formes & Lignes</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAddElement("shape", { shapeType: "rectangle" })}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl flex flex-col items-center gap-1 text-slate-700 transition"
              >
                <Square size={16} />
                <span className="text-[10px] font-bold">Rectangle</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "circle" })}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl flex flex-col items-center gap-1 text-slate-700 transition"
              >
                <Circle size={16} />
                <span className="text-[10px] font-bold">Cercle</span>
              </button>
              <button
                onClick={() => onAddElement("shape", { shapeType: "line", height: 2 })}
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl flex flex-col items-center gap-1 text-slate-700 transition"
              >
                <Minus size={16} />
                <span className="text-[10px] font-bold">Séparateur</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "tokens" ? (
        /* Dynamic Tokens Library */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <Input
              type="text"
              placeholder="Rechercher une variable..."
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              className="pl-8 h-9 rounded-xl border-slate-200 text-xs font-bold"
            />
          </div>

          <div className="space-y-1.5">
            {filteredTokens.map((item) => (
              <button
                key={item.key}
                onClick={() => onAddElement(
                  item.key === "{{student_photo}}" ? "studentPhoto" : item.key === "{{school_logo}}" ? "schoolLogo" : "variable",
                  { variableKey: item.key, content: item.key, fontSize: 12, fontWeight: "bold", color: "#1e1b4b" }
                )}
                className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between text-left transition group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">{item.label}</p>
                  <span className="text-[9px] font-mono text-indigo-600">{item.key}</span>
                </div>
                <Plus size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Icons Library */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Icônes interactives</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: "Phone", icon: Phone, label: "Téléphone" },
              { name: "Mail", icon: Mail, label: "Email" },
              { name: "Address", icon: MapPin, label: "Adresse" },
              { name: "School", icon: Building2, label: "École" },
              { name: "User", icon: User, label: "Utilisateur" },
              { name: "Calendar", icon: Calendar, label: "Date" },
            ].map((ic) => {
              const IconComp = ic.icon;
              return (
                <button
                  key={ic.name}
                  onClick={() => onAddElement("icon", { iconName: ic.name, width: 24, height: 24 })}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 text-slate-700 transition"
                >
                  <IconComp size={18} className="text-indigo-600" />
                  <span className="text-[10px] font-bold">{ic.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
