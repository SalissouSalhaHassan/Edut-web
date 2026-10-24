"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, Droplets, Home, Lightbulb, Moon, Printer, Save, ShieldCheck, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Room = { type: string; total: number | ""; used: number | ""; functional: number | ""; bad: number | ""; observations: string };

const initialRooms: Room[] = [
  { type: "Dur", total: 12, used: 11, functional: 10, bad: 2, observations: "" },
  { type: "Semi dur", total: 4, used: 4, functional: 3, bad: 1, observations: "" },
  { type: "Banco", total: 1, used: 1, functional: 1, bad: 0, observations: "" },
  { type: "Prefabriquee", total: 1, used: 1, functional: 1, bad: 0, observations: "" },
  { type: "Paillote", total: 0, used: 0, functional: 0, bad: 0, observations: "" },
  { type: "Espace temporaire", total: 0, used: 0, functional: 0, bad: 0, observations: "" },
];

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);

export default function InfrastructuresPage() {
  const [rooms, setRooms] = useState(initialRooms);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [services, setServices] = useState({
    electricity: true,
    water: true,
    latrinesTotal: 12,
    latrinesFunctional: 10,
    wall: false,
    garden: true,
    preschoolRooms: 2,
    preschoolFunctional: 2,
    generalState: "Bon",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edut_theme") || localStorage.getItem("edut_canevas_dark_mode");
      if (saved === "dark" || saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("edut_canevas_dark_mode", String(next));
        localStorage.setItem("edut_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  const totals = useMemo(() => rooms.reduce((acc, room) => ({
    total: acc.total + n(room.total),
    used: acc.used + n(room.used),
    functional: acc.functional + n(room.functional),
    bad: acc.bad + n(room.bad),
  }), { total: 0, used: 0, functional: 0, bad: 0 }), [rooms]);
  const invalid = rooms.filter((room) => n(room.used) > n(room.total) || n(room.functional) > n(room.total) || n(room.bad) > n(room.total));

  const updateRoom = (index: number, key: keyof Room, value: string) => {
    setRooms((current) => current.map((room, i) => {
      if (i !== index) return room;
      if (key === "type") return room;
      if (key === "observations") return { ...room, observations: value };
      return { ...room, [key]: value === "" ? "" : Math.max(0, Number(value)) };
    }));
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm print:border-b print:shadow-none transition-colors duration-300",
        isDarkMode ? "bg-[#111827]/95 border-slate-800 text-white shadow-xl shadow-black/40" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/canevas/etablissements/ETB-2026-001"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition print:hidden",
                isDarkMode ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Home size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Infrastructures</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Gestion des salles, services essentiels et etat general</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={toggleDarkMode}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 border",
                isDarkMode
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              )}
              title={isDarkMode ? "Mode Clair" : "Mode Sombre"}
            >
              {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              <span>{isDarkMode ? "Clair" : "Sombre"}</span>
            </button>
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition"><Save size={16} /> Enregistrer</button>
            <button className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}><Download size={16} /> Exporter</button>
            <button onClick={() => window.print()} className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}><Printer size={16} /> Imprimer</button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Total salles", totals.total, isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700"],
          ["Utilisees", totals.used, isDarkMode ? "bg-blue-950/60 text-blue-400 border border-blue-800/40" : "bg-blue-50 text-blue-700"],
          ["Fonctionnelles", totals.functional, isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"],
          ["Mauvais etat", totals.bad, isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/40" : "bg-rose-50 text-rose-700"],
        ].map(([label, value, style]) => (
          <div
            key={String(label)}
            className={cn(
              "rounded-[24px] border p-5 shadow-sm transition-colors duration-300",
              isDarkMode ? "border-slate-800 bg-[#111827]/90 text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white text-slate-950"
            )}
          >
            <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-400")}>{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p>
          </div>
        ))}
      </section>

      {invalid.length > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-[24px] border p-5 transition-colors duration-300",
          isDarkMode ? "border-rose-900/40 bg-rose-950/40 text-rose-300" : "border-rose-100 bg-rose-50 text-rose-800"
        )}>
          <AlertTriangle size={20} className="mt-0.5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-black">Controle requis</p>
            <p className="mt-1 text-xs font-bold">Les valeurs utilisees, fonctionnelles et mauvais etat ne doivent pas depasser le total.</p>
          </div>
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className={cn(
            "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
            isDarkMode ? "border-slate-800 bg-[#111827]/90 shadow-xl shadow-black/20" : "border-slate-100 bg-white"
          )}>
            <div className={cn("border-b p-5", isDarkMode ? "border-slate-800" : "border-slate-100")}>
              <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>1. Salles de classe</h2>
              <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Etat des infrastructures par type de construction</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isDarkMode ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-400"
                )}>
                  <tr>
                    <th className="px-5 py-4">Type infrastructure</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Utilisees</th>
                    <th className="px-5 py-4">Non utilisees</th>
                    <th className="px-5 py-4">Fonctionnelles</th>
                    <th className="px-5 py-4">Mauvais etat</th>
                    <th className="px-5 py-4">Observations</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-100 text-slate-700")}>
                  {rooms.map((room, index) => (
                    <tr key={room.type} className="text-sm font-bold">
                      <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{room.type}</td>
                      {(["total", "used"] as const).map((key) => (
                        <td key={key} className="px-5 py-4">
                          <input
                            type="number"
                            min={0}
                            value={room[key]}
                            onChange={(e) => updateRoom(index, key, e.target.value)}
                            className={cn(
                              "h-11 w-28 rounded-2xl border px-4 font-black outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        </td>
                      ))}
                      <td className="px-5 py-4 font-black text-indigo-500">{Math.max(0, n(room.total) - n(room.used))}</td>
                      {(["functional", "bad"] as const).map((key) => (
                        <td key={key} className="px-5 py-4">
                          <input
                            type="number"
                            min={0}
                            value={room[key]}
                            onChange={(e) => updateRoom(index, key, e.target.value)}
                            className={cn(
                              "h-11 w-28 rounded-2xl border px-4 font-black outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <input
                          value={room.observations}
                          onChange={(e) => updateRoom(index, "observations", e.target.value)}
                          placeholder="Observation..."
                          className={cn(
                            "h-11 w-full rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300"
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className={cn(
              "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
              isDarkMode ? "border-slate-800 bg-[#111827]/90" : "border-slate-100 bg-white"
            )}>
              <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>3. Prescolaire</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className={cn("rounded-2xl p-4 transition-colors", isDarkMode ? "bg-slate-900/80 border border-slate-800" : "bg-slate-50")}>
                  <span className={cn("text-[10px] font-black uppercase", isDarkMode ? "text-slate-400" : "text-slate-400")}>Salles prescolaires</span>
                  <input
                    type="number"
                    min={0}
                    value={services.preschoolRooms}
                    onChange={(e) => setServices({ ...services, preschoolRooms: Math.max(0, Number(e.target.value)) })}
                    className={cn("mt-2 w-full bg-transparent text-xl font-black outline-none", isDarkMode ? "text-white" : "text-slate-950")}
                  />
                </label>
                <label className={cn("rounded-2xl p-4 transition-colors", isDarkMode ? "bg-slate-900/80 border border-slate-800" : "bg-slate-50")}>
                  <span className={cn("text-[10px] font-black uppercase", isDarkMode ? "text-slate-400" : "text-slate-400")}>Fonctionnelles</span>
                  <input
                    type="number"
                    min={0}
                    value={services.preschoolFunctional}
                    onChange={(e) => setServices({ ...services, preschoolFunctional: Math.max(0, Number(e.target.value)) })}
                    className={cn("mt-2 w-full bg-transparent text-xl font-black outline-none", isDarkMode ? "text-white" : "text-slate-950")}
                  />
                </label>
              </div>
            </div>

            <div className={cn(
              "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
              isDarkMode ? "border-slate-800 bg-[#111827]/90" : "border-slate-100 bg-white"
            )}>
              <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>4. Etat general</h2>
              <select
                value={services.generalState}
                onChange={(e) => setServices({ ...services, generalState: e.target.value })}
                className={cn(
                  "mt-5 h-12 w-full rounded-2xl border px-4 text-sm font-black outline-none transition",
                  isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                )}
              >
                <option>Bon</option>
                <option>Moyen</option>
                <option>Mauvais</option>
                <option>Critique</option>
              </select>
            </div>
          </section>
        </div>

        <aside className={cn(
          "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
          isDarkMode ? "border-slate-800 bg-[#111827]/90 text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white"
        )}>
          <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>2. Services essentiels</h2>
          <div className="mt-5 space-y-4">
            {[["electricity", "Electricite", Lightbulb], ["water", "Point d'eau", Droplets], ["wall", "Mur de cloture", ShieldCheck], ["garden", "Jardin scolaire", Home]].map(([key, label, Icon]: any) => (
              <label
                key={key}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4 transition cursor-pointer",
                  isDarkMode ? "border-slate-800 bg-slate-900/60 hover:bg-slate-900" : "border-slate-100 hover:bg-slate-50"
                )}
              >
                <span className={cn("flex items-center gap-3 text-sm font-black", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                  <Icon size={18} className="text-indigo-400" /> {label}
                </span>
                <input
                  type="checkbox"
                  checked={(services as any)[key]}
                  onChange={(e) => setServices({ ...services, [key]: e.target.checked })}
                  className="h-5 w-5 accent-indigo-600 rounded cursor-pointer"
                />
              </label>
            ))}

            <label className={cn("block rounded-2xl border p-4 transition", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100")}>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-400")}>Latrines total</span>
              <input
                type="number"
                min={0}
                value={services.latrinesTotal}
                onChange={(e) => setServices({ ...services, latrinesTotal: Math.max(0, Number(e.target.value)) })}
                className={cn("mt-2 w-full bg-transparent text-2xl font-black outline-none", isDarkMode ? "text-white" : "text-slate-950")}
              />
            </label>

            <label className={cn("block rounded-2xl border p-4 transition", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100")}>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-400")}>Latrines fonctionnelles</span>
              <input
                type="number"
                min={0}
                value={services.latrinesFunctional}
                onChange={(e) => setServices({ ...services, latrinesFunctional: Math.max(0, Number(e.target.value)) })}
                className={cn("mt-2 w-full bg-transparent text-2xl font-black outline-none", isDarkMode ? "text-white" : "text-slate-950")}
              />
            </label>

            <div className={cn(
              "rounded-2xl p-4 transition-colors",
              isDarkMode ? "bg-emerald-950/40 border border-emerald-900/40 text-emerald-300" : "bg-emerald-50 text-emerald-800"
            )}>
              <CheckCircle2 size={20} className="text-emerald-400" />
              <p className="mt-2 text-sm font-black">Controle automatique actif</p>
              <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-emerald-300/80" : "text-emerald-800/80")}>
                Les totaux et anomalies sont recalcules en temps reel.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
