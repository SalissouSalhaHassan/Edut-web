"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MapPin,
  Building2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Layers,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Zap,
  Users,
  Search,
  ArrowRight,
  Phone,
  MessageSquare,
  FileText,
  ExternalLink,
  X,
  Compass,
  RotateCcw,
  Sparkles,
  Send,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

export interface GisSchoolPoint {
  code: string;
  name: string;
  type: string; // "Public" | "Privé" | "Communautaire"
  cycle: string; // "Primaire" | "Collège" | "Lycée" | "Supérieur"
  region: string;
  commune: string;
  quartier?: string;
  eleves: number;
  filles?: number;
  garcons?: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  statut: string; // "Validé" | "En attente" | "Rejeté" | "Brouillon"
  completion?: number;
  lat?: number;
  lng?: number;
  phone?: string;
  directorName?: string;
}

// Regional reference boundaries & Niger SVG coordinates
const REGION_COORDS: Record<string, { lat: number; lng: number; x: number; y: number; zoomLevel: number }> = {
  "Toutes les régions": { lat: 14.5, lng: 5.5, x: 450, y: 300, zoomLevel: 1 },
  "Niamey": { lat: 13.51, lng: 2.11, x: 190, y: 440, zoomLevel: 3.5 },
  "Maradi": { lat: 13.50, lng: 7.10, x: 530, y: 445, zoomLevel: 3 },
  "Zinder": { lat: 13.80, lng: 8.98, x: 670, y: 430, zoomLevel: 3 },
  "Tahoua": { lat: 14.89, lng: 5.26, x: 400, y: 340, zoomLevel: 2.5 },
  "Tillabéri": { lat: 14.20, lng: 1.45, x: 140, y: 380, zoomLevel: 2.5 },
  "Dosso": { lat: 13.04, lng: 3.19, x: 260, y: 470, zoomLevel: 3 },
  "Agadez": { lat: 16.97, lng: 7.99, x: 610, y: 190, zoomLevel: 2 },
  "Diffa": { lat: 13.31, lng: 12.61, x: 860, y: 460, zoomLevel: 2.5 },
};

// Default sample schools if none provided
const DEFAULT_GIS_SCHOOLS: GisSchoolPoint[] = [
  {
    code: "ETB-2026-001",
    name: "Université Privée Internationale Aboubacar Ibrahim",
    type: "Privé",
    cycle: "Supérieur",
    region: "Maradi",
    commune: "Maradi 1",
    quartier: "Zaria",
    eleves: 364,
    filles: 180,
    garcons: 184,
    enseignants: 16,
    salles: 19,
    eau: true,
    electricite: true,
    statut: "Validé",
    completion: 100,
    lat: 13.512,
    lng: 7.105,
    phone: "+227 90 12 34 56",
    directorName: "Dr. Ousmane Ibrahim",
  },
  {
    code: "ETB-2026-018",
    name: "Complexe Scolaire Excellence Yantala",
    type: "Privé",
    cycle: "Lycée",
    region: "Niamey",
    commune: "Niamey I",
    quartier: "Yantala Haut",
    eleves: 642,
    filles: 318,
    garcons: 324,
    enseignants: 24,
    salles: 18,
    eau: true,
    electricite: true,
    statut: "Validé",
    completion: 98,
    lat: 13.535,
    lng: 2.085,
    phone: "+227 96 44 22 11",
    directorName: "M. Salifou Amadou",
  },
  {
    code: "ETB-2026-043",
    name: "École Primaire Publique Bobiel B",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey I",
    quartier: "Bobiel",
    eleves: 481,
    filles: 236,
    garcons: 245,
    enseignants: 14,
    salles: 12,
    eau: false, // ALERTE CRITIQUE EAU
    electricite: true,
    statut: "En attente",
    completion: 76,
    lat: 13.555,
    lng: 2.115,
    phone: "+227 92 33 55 77",
    directorName: "Mme. Mariama Seydou",
  },
  {
    code: "ETB-2026-067",
    name: "Collège d'Enseignement Général Lazaret (CEG 14)",
    type: "Public",
    cycle: "Collège",
    region: "Niamey",
    commune: "Niamey III",
    quartier: "Lazaret",
    eleves: 890,
    filles: 420,
    garcons: 470,
    enseignants: 18, // DEFICIT ENSEIGNANTS
    salles: 14,
    eau: false,
    electricite: false, // ALERTE CRITIQUE DOUBLE
    statut: "Rejeté",
    completion: 62,
    lat: 13.515,
    lng: 2.165,
    phone: "+227 94 88 99 00",
    directorName: "M. Idrissa Moussa",
  },
  {
    code: "ETB-2026-092",
    name: "Lycée Dan Baskoré de Maradi",
    type: "Public",
    cycle: "Lycée",
    region: "Maradi",
    commune: "Maradi 2",
    quartier: "Bagalam",
    eleves: 1240,
    filles: 580,
    garcons: 660,
    enseignants: 38,
    salles: 22,
    eau: true,
    electricite: true,
    statut: "Validé",
    completion: 95,
    lat: 13.485,
    lng: 7.092,
    phone: "+227 97 11 22 33",
    directorName: "M. Abdoulaye Garba",
  },
  {
    code: "ETB-2026-115",
    name: "École Communautaire Zinder Sabon Gari",
    type: "Communautaire",
    cycle: "Primaire",
    region: "Zinder",
    commune: "Zinder 1",
    quartier: "Sabon Gari",
    eleves: 520,
    filles: 250,
    garcons: 270,
    enseignants: 8, // DEFICIT
    salles: 7,
    eau: false,
    electricite: true,
    statut: "En attente",
    completion: 68,
    lat: 13.805,
    lng: 8.985,
    phone: "+227 91 55 44 22",
    directorName: "M. Harouna Kane",
  },
  {
    code: "ETB-2026-140",
    name: "Lycée Agadez Aïr",
    type: "Public",
    cycle: "Lycée",
    region: "Agadez",
    commune: "Agadez",
    quartier: "Dagmanet",
    eleves: 780,
    filles: 360,
    garcons: 420,
    enseignants: 26,
    salles: 16,
    eau: true,
    electricite: true,
    statut: "Validé",
    completion: 92,
    lat: 16.975,
    lng: 7.995,
    phone: "+227 96 33 11 00",
    directorName: "M. Ahmed Rhissa",
  },
  {
    code: "ETB-2026-165",
    name: "Complexe Scolaire Tahoua Ader",
    type: "Privé",
    cycle: "Collège",
    region: "Tahoua",
    commune: "Tahoua 1",
    quartier: "Karkara",
    eleves: 410,
    filles: 215,
    garcons: 195,
    enseignants: 15,
    salles: 10,
    eau: true,
    electricite: false, // ALERTE ELEC
    statut: "En attente",
    completion: 80,
    lat: 14.892,
    lng: 5.275,
    phone: "+227 90 77 88 99",
    directorName: "Mme. Balkissa Adamou",
  },
  {
    code: "ETB-2026-180",
    name: "École Primaire Dosso Djerma",
    type: "Public",
    cycle: "Primaire",
    region: "Dosso",
    commune: "Dosso",
    quartier: "Centre",
    eleves: 340,
    filles: 170,
    garcons: 170,
    enseignants: 10,
    salles: 6,
    eau: true,
    electricite: true,
    statut: "Validé",
    completion: 100,
    lat: 13.052,
    lng: 3.205,
    phone: "+227 93 22 11 44",
    directorName: "M. Hassane Souley",
  },
];

interface SchoolGisMapProps {
  schools?: GisSchoolPoint[];
  isDarkMode?: boolean;
  onSelectSchool?: (school: GisSchoolPoint) => void;
  className?: string;
}

export default function SchoolGisMap({
  schools = DEFAULT_GIS_SCHOOLS,
  isDarkMode = false,
  onSelectSchool,
  className,
}: SchoolGisMapProps) {
  const [selectedRegion, setSelectedRegion] = useState("Toutes les régions");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState("all");
  const [selectedAlertFilter, setSelectedAlertFilter] = useState<"all" | "water" | "electricity" | "teachers" | "validated">("all");
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite" | "dark">("standard");

  const [activeSchool, setActiveSchool] = useState<GisSchoolPoint | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic filter lists
  const regions = useMemo(() => {
    const list = Array.from(new Set(schools.map(s => s.region).filter(Boolean)));
    return ["Toutes les régions", ...list];
  }, [schools]);

  const cycles = useMemo(() => {
    const list = Array.from(new Set(schools.map(s => s.cycle).filter(Boolean)));
    return ["all", ...list];
  }, [schools]);

  // Compute school status category & color
  const getSchoolStatusDetails = (school: GisSchoolPoint) => {
    const isCritical = !school.eau || !school.electricite;
    const isTeacherDeficit = school.eleves / (school.enseignants || 1) > 40;
    const isValidated = school.statut.toLowerCase().includes("valide") || school.statut.toLowerCase().includes("validé");

    if (isCritical) {
      return {
        category: "critical",
        label: "Alerte Critique (Eau/Élec)",
        color: "#ef4444", // Red
        pulseClass: "animate-ping bg-red-400 opacity-75",
        badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        icon: AlertTriangle,
      };
    }
    if (isTeacherDeficit) {
      return {
        category: "deficit",
        label: "Déficit Enseignants",
        color: "#f59e0b", // Amber
        pulseClass: "bg-amber-400 opacity-50",
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        icon: Flame,
      };
    }
    if (isValidated) {
      return {
        category: "validated",
        label: "Conforme & Validé",
        color: "#10b981", // Green
        pulseClass: "bg-emerald-400 opacity-40",
        badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
      };
    }
    return {
      category: "pending",
      label: "En attente d'audit",
      color: "#06b6d4", // Cyan
      pulseClass: "bg-cyan-400 opacity-40",
      badgeBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      icon: Building2,
    };
  };

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      if (selectedRegion !== "Toutes les régions" && s.region !== selectedRegion) return false;
      if (selectedType !== "all" && s.type !== selectedType) return false;
      if (selectedCycle !== "all" && s.cycle !== selectedCycle) return false;

      if (selectedAlertFilter === "water" && s.eau) return false;
      if (selectedAlertFilter === "electricity" && s.electricite) return false;
      if (selectedAlertFilter === "teachers" && s.eleves / (s.enseignants || 1) <= 40) return false;
      if (selectedAlertFilter === "validated" && !s.statut.toLowerCase().includes("valid")) return false;

      return true;
    });
  }, [schools, selectedRegion, selectedType, selectedCycle, selectedAlertFilter]);

  // Overall KPIs
  const stats = useMemo(() => {
    const total = filteredSchools.length;
    const critical = filteredSchools.filter(s => !s.eau || !s.electricite).length;
    const deficit = filteredSchools.filter(s => s.eleves / (s.enseignants || 1) > 40).length;
    const validated = filteredSchools.filter(s => s.statut.toLowerCase().includes("valid")).length;
    const totalEleves = filteredSchools.reduce((acc, s) => acc + (s.eleves || 0), 0);
    return { total, critical, deficit, validated, totalEleves };
  }, [filteredSchools]);

  // Map coordinate translation to SVG 1000x600 canvas
  // Niger bounding coordinates: Lat [11.5 to 23.5], Lng [0.1 to 16.0]
  const projectCoordinates = (lat: number, lng: number) => {
    const minLng = 0.0;
    const maxLng = 16.0;
    const minLat = 11.5;
    const maxLat = 23.5;

    const x = ((lng - minLng) / (maxLng - minLng)) * 880 + 60;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 500 + 50;

    return { x, y };
  };

  // Zoom to Region
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    const target = REGION_COORDS[region] || REGION_COORDS["Toutes les régions"];
    setZoom(target.zoomLevel);
    if (region === "Toutes les régions") {
      setPan({ x: 0, y: 0 });
    } else {
      setPan({
        x: (500 - target.x) * (target.zoomLevel - 1) * 0.7,
        y: (300 - target.y) * (target.zoomLevel - 1) * 0.7,
      });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 6));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedRegion("Toutes les régions");
    setSelectedAlertFilter("all");
    setSelectedType("all");
    setSelectedCycle("all");
  };

  // Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col w-full rounded-3xl border overflow-hidden shadow-2xl transition-all duration-300",
        isDarkMode || mapStyle === "dark"
          ? "bg-[#0b0f19] border-slate-800 text-slate-100"
          : "bg-slate-900 border-slate-700/60 text-white",
        isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "h-[740px]",
        className
      )}
    >
      {/* Top Header & GIS Control Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20">
            <Compass className="size-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Carte Scolaire SIG Interactive
                <span className="rounded-full bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-300">
                  GIS Live
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Géolocalisation en temps réel du parc scolaire et détection des alertes d'infrastructure
            </p>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Region Selector */}
          <select
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="h-9 rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-xs font-semibold text-slate-200 outline-none focus:border-teal-500 transition-colors"
          >
            {regions.map((reg) => (
              <option key={reg} value={reg} className="bg-slate-900 text-slate-100">
                {reg}
              </option>
            ))}
          </select>

          {/* Cycle Selector */}
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="h-9 rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-xs font-semibold text-slate-200 outline-none focus:border-teal-500 transition-colors"
          >
            <option value="all">Tous cycles</option>
            {cycles.filter(c => c !== "all").map(c => (
              <option key={c} value={c} className="bg-slate-900 text-slate-100">{c}</option>
            ))}
          </select>

          {/* Map Style Switcher */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setMapStyle("standard")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                mapStyle === "standard" ? "bg-teal-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
              )}
            >
              Vecteur
            </button>
            <button
              onClick={() => setMapStyle("satellite")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                mapStyle === "satellite" ? "bg-teal-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
              )}
            >
              Relief
            </button>
            <button
              onClick={() => setMapStyle("dark")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                mapStyle === "dark" ? "bg-teal-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
              )}
            >
              Néon SIG
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Floating Status & Quick Action Pills */}
      <div className="absolute top-20 left-6 z-20 flex flex-wrap gap-2 max-w-xl">
        <button
          onClick={() => setSelectedAlertFilter("all")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition-all shadow-md",
            selectedAlertFilter === "all"
              ? "bg-slate-100 text-slate-950 border-white shadow-white/10"
              : "bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800"
          )}
        >
          <span>Tous</span>
          <span className="rounded-full bg-slate-700/60 px-1.5 py-0.2 text-[10px] text-white">
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setSelectedAlertFilter("water")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition-all shadow-md",
            selectedAlertFilter === "water"
              ? "bg-red-500 text-white border-red-400 shadow-red-500/30"
              : "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
          )}
        >
          <Droplets size={14} className="text-red-400" />
          <span>Sans Eau</span>
          <span className="rounded-full bg-red-950/60 px-1.5 py-0.2 text-[10px] text-red-200">
            {schools.filter(s => !s.eau).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedAlertFilter("electricity")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition-all shadow-md",
            selectedAlertFilter === "electricity"
              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30"
              : "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
          )}
        >
          <Zap size={14} className="text-amber-400" />
          <span>Sans Électricité</span>
          <span className="rounded-full bg-amber-950/60 px-1.5 py-0.2 text-[10px] text-amber-200">
            {schools.filter(s => !s.electricite).length}
          </span>
        </button>

        <button
          onClick={() => setSelectedAlertFilter("teachers")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition-all shadow-md",
            selectedAlertFilter === "teachers"
              ? "bg-orange-500 text-white border-orange-400 shadow-orange-500/30"
              : "bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30"
          )}
        >
          <Users size={14} className="text-orange-400" />
          <span>Déficit Personnel</span>
          <span className="rounded-full bg-orange-950/60 px-1.5 py-0.2 text-[10px] text-orange-200">
            {stats.deficit}
          </span>
        </button>

        <button
          onClick={() => setSelectedAlertFilter("validated")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold backdrop-blur-md border transition-all shadow-md",
            selectedAlertFilter === "validated"
              ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/30"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
          )}
        >
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>Conforme</span>
          <span className="rounded-full bg-emerald-950/60 px-1.5 py-0.2 text-[10px] text-emerald-200">
            {stats.validated}
          </span>
        </button>
      </div>

      {/* Map Canvas with Interactive SVG & Pins */}
      <div
        className={cn(
          "relative flex-1 w-full overflow-hidden select-none cursor-grab active:cursor-grabbing",
          mapStyle === "satellite"
            ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-stone-900 to-black"
            : mapStyle === "dark"
            ? "bg-[#06080e]"
            : "bg-[#0d1322]"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Subtle GIS Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
            backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* SVG GIS Layer */}
        <div
          className="absolute inset-0 transition-transform duration-75 origin-center flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-full max-w-[1200px] max-h-[700px] overflow-visible"
          >
            {/* Ambient glows */}
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="nigerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#090d16" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Stylized borders for Niger outline */}
            <g id="niger-country-contour" className="transition-all duration-500">
              {/* Niger Simplified Boundary Polygon */}
              <polygon
                points="120,440 180,390 140,320 220,280 320,240 480,140 680,100 800,120 900,240 920,400 880,480 780,460 680,440 540,460 380,440 280,490 200,470"
                fill="url(#nigerGradient)"
                stroke="#334155"
                strokeWidth="2"
                strokeDasharray="4 2"
                className="hover:stroke-teal-500/50 transition-colors"
              />

              {/* Regional internal boundaries */}
              <path
                d="M 320,240 L 400,340 L 380,440 M 480,140 L 530,300 L 540,460 M 680,100 L 670,300 L 680,440 M 800,120 L 780,320 L 780,460"
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
              />

              {/* River Niger curve representation */}
              <path
                d="M 120,380 Q 160,420 190,440 T 260,480"
                fill="none"
                stroke="#0284c7"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>

            {/* Regional Name Labels */}
            <g id="region-labels" className="pointer-events-none select-none text-[11px] font-black uppercase tracking-widest fill-slate-500/70">
              <text x="175" y="425">Niamey</text>
              <text x="515" y="430">Maradi</text>
              <text x="655" y="415">Zinder</text>
              <text x="385" y="325">Tahoua</text>
              <text x="125" y="365">Tillabéri</text>
              <text x="245" y="455">Dosso</text>
              <text x="595" y="175">Agadez</text>
              <text x="845" y="445">Diffa</text>
            </g>

            {/* School Points & Markers */}
            <g id="school-markers">
              {filteredSchools.map((school) => {
                const coords = projectCoordinates(
                  school.lat || 13.51,
                  school.lng || 2.11
                );
                const statusDetails = getSchoolStatusDetails(school);
                const isSelected = activeSchool?.code === school.code;

                return (
                  <g
                    key={school.code}
                    transform={`translate(${coords.x}, ${coords.y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSchool(school);
                      if (onSelectSchool) onSelectSchool(school);
                    }}
                  >
                    {/* Pulsing ring for critical schools */}
                    {statusDetails.category === "critical" && (
                      <circle
                        r="18"
                        className={statusDetails.pulseClass}
                      />
                    )}

                    {/* Outer hover beacon */}
                    <circle
                      r={isSelected ? "14" : "10"}
                      fill={statusDetails.color}
                      opacity={isSelected ? "0.4" : "0.2"}
                      className="group-hover:opacity-40 transition-all duration-300"
                    />

                    {/* Core pin point */}
                    <circle
                      r={isSelected ? "7" : "5"}
                      fill={statusDetails.color}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "2.5" : "1.5"}
                      filter="url(#glow)"
                      className="transition-transform duration-200 group-hover:scale-125"
                    />

                    {/* Quick Marker Code Tag */}
                    <text
                      y="-12"
                      textAnchor="middle"
                      className="text-[9px] font-black fill-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none drop-shadow-md"
                    >
                      {school.name.slice(0, 16)}...
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Floating Zoom & Map Controls (Bottom Right) */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            title="Zoom Avant"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-white shadow-lg backdrop-blur-md hover:bg-slate-800 active:scale-95 transition-all"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Arrière"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-white shadow-lg backdrop-blur-md hover:bg-slate-800 active:scale-95 transition-all"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleReset}
            title="Réinitialiser la vue"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/90 text-teal-400 shadow-lg backdrop-blur-md hover:bg-slate-800 active:scale-95 transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Legend Panel (Bottom Left) */}
        <div className="absolute bottom-6 left-6 z-20 hidden sm:flex flex-col gap-1.5 rounded-2xl border border-slate-800/90 bg-slate-950/80 p-3.5 backdrop-blur-md text-[11px] shadow-xl">
          <span className="font-black uppercase tracking-wider text-slate-400 mb-1">
            Légende SIG
          </span>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-200">Établissement Conforme & Validé</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50" />
            <span className="text-slate-200 font-semibold text-red-400">Alerte Critique (Sans Eau / Élec)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-200">Déficit Enseignants (&gt;40 él/ens)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
            <span className="text-slate-200">En cours d'audit</span>
          </div>
        </div>

        {/* Active School Side Drawer / Slide-Over Card */}
        {activeSchool && (
          <div className="absolute top-4 right-4 z-30 w-full max-w-sm rounded-3xl border border-slate-700/80 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="inline-block rounded-lg bg-teal-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-300">
                  {activeSchool.code}
                </span>
                <h3 className="mt-1 text-sm font-black leading-snug text-white">
                  {activeSchool.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeSchool.region} • {activeSchool.commune} {activeSchool.quartier ? `(${activeSchool.quartier})` : ""}
                </p>
              </div>
              <button
                onClick={() => setActiveSchool(null)}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* School KPIs grid */}
            <div className="grid grid-cols-2 gap-2 py-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-[10px] text-slate-400 block">Effectif Global</span>
                <span className="text-base font-black text-white">{activeSchool.eleves}</span>
                <span className="text-[10px] text-slate-500 block">
                  {activeSchool.filles || Math.floor(activeSchool.eleves / 2)} F • {activeSchool.garcons || Math.ceil(activeSchool.eleves / 2)} G
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-[10px] text-slate-400 block">Encadrement</span>
                <span className="text-base font-black text-white">{activeSchool.enseignants} Ens.</span>
                <span className="text-[10px] text-slate-500 block">
                  Ratio: {Math.round(activeSchool.eleves / (activeSchool.enseignants || 1))} él./ens.
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Accès Eau</span>
                  <span className={cn("text-xs font-bold", activeSchool.eau ? "text-emerald-400" : "text-red-400")}>
                    {activeSchool.eau ? "Potable disponible" : "Aucun point d'eau"}
                  </span>
                </div>
                <Droplets size={18} className={activeSchool.eau ? "text-emerald-400" : "text-red-400"} />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Électricité</span>
                  <span className={cn("text-xs font-bold", activeSchool.electricite ? "text-emerald-400" : "text-red-400")}>
                    {activeSchool.electricite ? "Réseau actif" : "Hors réseau"}
                  </span>
                </div>
                <Zap size={18} className={activeSchool.electricite ? "text-emerald-400" : "text-red-400"} />
              </div>
            </div>

            {/* Direct Action Hub */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              {/* WhatsApp direct notification */}
              <a
                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(activeSchool.phone || "+22790000000")}&text=${encodeURIComponent(
                  `Bonjour Direction ${activeSchool.name},\nConcernant le dossier canevas scolaire ${activeSchool.code} (Statut: ${activeSchool.statut}):\nEffectifs: ${activeSchool.eleves} élèves, Eau: ${activeSchool.eau ? "Oui" : "Non"}, Électricité: ${activeSchool.electricite ? "Oui" : "Non"}.\nMerci de mettre à jour vos indicateurs sur Edut Pro.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
              >
                <MessageSquare size={14} />
                <span>Alerter Proviseur (WhatsApp)</span>
              </a>

              <Link
                href={`/dashboard/canevas/etablissements/${activeSchool.code}`}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Eye size={14} />
                <span>Ouvrir Fiche Complète</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
