"use client";

import React from "react";
import { Info, Shield, GraduationCap, Calendar, Settings, Heart, CheckCircle2, Bookmark } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200">
          <Info size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">À propos d'Edut Pro</h1>
          <p className="text-slate-400 text-sm font-medium mt-0.5">Informations sur la plateforme et les versions du système</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edut Pro — Système de Gestion Scolaire Intégré</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Edut Pro est une plateforme SaaS moderne de gestion d'établissements scolaires conçue pour rationaliser les processus administratifs, académiques, financiers et pédagogiques.
              </p>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Grâce à son architecture multi-tenant et ses applications mobiles intégrées, Edut Pro relie en temps réel les administrateurs, les enseignants, les élèves et les parents d'élèves pour un suivi fluide et une communication transparente.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fonctionnalités Clés du Système</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Gestion Académique</p>
                    <p className="text-[10px] text-slate-400 font-medium">Filières, classes, examens, notes et bulletins automatisés.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Suivi Pédagogique</p>
                    <p className="text-[10px] text-slate-400 font-medium">Cahier de textes quotidien, planifications et remédiation scolaire.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Multi-Tenancy & Sécurité</p>
                    <p className="text-[10px] text-slate-400 font-medium">Séparation stricte des écoles et gestion fine des permissions (RBAC).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Ressources & Logistique</p>
                    <p className="text-[10px] text-slate-400 font-medium">Gestion du transport scolaire, de l'internat, de la cantine et de la bibliothèque.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Informations Système</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Version du logiciel</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">v2.4.0</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Statut du serveur</span>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Actif
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Dernière mise à jour</span>
                </div>
                <span className="text-xs font-bold text-slate-500">Juillet 2026</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                Propulsé avec <Heart size={10} className="text-rose-500 fill-rose-500" /> par l'équipe Edut
              </p>
              <p className="text-[9px] text-slate-400 mt-1">© 2026 Edut Pro. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
