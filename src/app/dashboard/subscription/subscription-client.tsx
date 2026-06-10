"use client";

import React, { useState, useTransition } from "react";
import { 
  Check, 
  Sparkles, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  Building2,
  ArrowRight,
  TrendingUp,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateMySchoolSubscription } from "@/domains/auth/actions/subscription.actions";

type SchoolType = {
  id: number;
  name: string;
  slug: string;
  plan: string | null;
  status: string | null;
  subscriptionExpiry: Date | string | null;
} | null;

export default function SubscriptionClient({ 
  initialSchool,
  user
}: { 
  initialSchool: SchoolType;
  user: any;
}) {
  const [school, setSchool] = useState<SchoolType>(initialSchool);
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = (planName: string) => {
    setSelectedPlan(planName);
    startTransition(async () => {
      try {
        const res = await updateMySchoolSubscription(planName);
        if (res.success) {
          toast.success(`Votre école a été mise à niveau vers le forfait ${planName.toUpperCase()} !`);
          // Calculate new expiry for local state
          const newExpiry = new Date();
          if (planName === "enterprise") {
            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          } else {
            newExpiry.setDate(newExpiry.getDate() + 30);
          }
          
          setSchool(prev => prev ? {
            ...prev,
            plan: planName,
            status: "active",
            subscriptionExpiry: newExpiry
          } : null);
        } else {
          toast.error(res.error || "Une erreur est survenue lors de la mise à niveau.");
        }
      } catch (err: any) {
        toast.error(err.message || "Erreur réseau ou serveur.");
      } finally {
        setSelectedPlan(null);
      }
    });
  };

  // Plan mapping details
  const plans = [
    {
      id: "basic",
      name: "Forfait Basique",
      price: "19 000 F CFA",
      usdPrice: "$29",
      period: "par mois",
      description: "Pour les petites écoles souhaitant digitaliser leur gestion académique de base.",
      color: "blue",
      popular: false,
      features: [
        "Jusqu'à 100 élèves enregistrés",
        "Gestion académique de base (Classes & Matières)",
        "Gestion des emplois du temps de base",
        "Saisie des notes & Bulletins de base",
        "1 compte Administrateur + 10 comptes Enseignants",
        "Support standard par email",
      ]
    },
    {
      id: "pro",
      name: "Forfait Professionnel",
      price: "49 000 F CFA",
      usdPrice: "$79",
      period: "par mois",
      description: "Notre offre phare pour une gestion scolaire moderne, collaborative et 100% connectée.",
      color: "indigo",
      popular: true,
      features: [
        "Nombre d'élèves et classes illimités",
        "LMS complet & Classes virtuelles intégrées",
        "Gestion RH & Paie (Fiches de paie automatisées)",
        "Finances & Suivi des paiements COGES",
        "Messagerie & Alertes SMS/Email instantanées aux parents",
        "Générateur de cartes scolaires & Code-barres",
        "Support prioritaire 24/7",
      ]
    },
    {
      id: "enterprise",
      name: "Forfait Entreprise",
      price: "Sur Mesure",
      usdPrice: "Custom",
      period: "engagement annuel",
      description: "Pour les grands groupes scolaires nécessitant une infrastructure dédiée et de l'IA.",
      color: "emerald",
      popular: false,
      features: [
        "Gestion multi-établissements / multi-campus",
        "Générateur d'Emplois du Temps par IA (Automatique)",
        "Sous-domaine personnalisé (ex: votre-ecole.edut.pro)",
        "Intégration API & SSO personnalisés",
        "Sauvegardes quotidiennes redondantes",
        "Formation sur site & Directeur de compte dédié",
      ]
    }
  ];

  if (!school) {
    return (
      <div className="p-10 space-y-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-xl rounded-[2.5rem] p-8 text-center bg-white">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-slate-900 mb-2">Aucune école trouvée</h3>
          <p className="text-slate-500 mb-6 font-medium">
            Pour gérer un abonnement, vous devez vous connecter avec un compte rattaché à une école spécifique.
          </p>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-bold shadow-lg" onClick={() => window.location.href = "/dashboard"}>
            Retour au Tableau de Bord
          </Button>
        </Card>
      </div>
    );
  }

  const currentPlan = school.plan || "basic";
  const currentStatus = school.status || "active";
  const formattedExpiry = school.subscriptionExpiry 
    ? new Date(school.subscriptionExpiry).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "Non spécifiée";

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <CreditCard className="text-indigo-600 w-9 h-9" />
            Mon Abonnement & Licence
          </h1>
          <p className="text-slate-500 font-semibold mt-1">
            Gérez le forfait de votre établissement, consultez vos factures et mettez à niveau vos services.
          </p>
        </div>
        
        <Badge className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-sm border-none
          ${currentStatus === "active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
        >
          <span className={`w-2 h-2 rounded-full ${currentStatus === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
          {currentStatus === "active" ? "Abonnement Actif" : "Abonnement Suspendu"}
        </Badge>
      </div>

      {/* Subscription Summary Card */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-indigo-100/50 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 md:p-10 shadow-2xl text-white">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                <Building2 size={24} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Établissement</p>
                <h2 className="text-xl font-black tracking-tight">{school.name}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-indigo-200">
              <span className="font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/5">
                {school.slug}.edut.pro
              </span>
            </div>
          </div>

          <div className="space-y-3 lg:border-l lg:border-white/10 lg:pl-10">
            <div className="flex items-center gap-2">
              <Zap className="text-amber-400 fill-amber-400" size={20} />
              <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Forfait Actif</p>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black capitalize tracking-tight">
                {currentPlan === "basic" ? "Basique 🟢" : currentPlan === "pro" ? "Professionnel 🔥" : "Entreprise ⚡"}
              </h3>
            </div>
            <p className="text-xs text-indigo-200/80 font-medium">
              Accès complet à tous les modules inclus dans votre forfait.
            </p>
          </div>

          <div className="space-y-3 lg:border-l lg:border-white/10 lg:pl-10">
            <div className="flex items-center gap-2">
              <Calendar className="text-indigo-300" size={20} />
              <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Renouvellement automatique</p>
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              {formattedExpiry}
            </h3>
            <p className="text-xs text-indigo-200/80 font-medium">
              Sera renouvelé ou expirera à cette date.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Choisissez la formule idéale pour votre établissement
        </h2>
        <p className="text-slate-500 font-semibold">
          Chaque formule est conçue pour répondre précisément aux besoins et à la taille de votre école. Mettez à niveau à tout moment.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isUpgradingThis = selectedPlan === plan.id;
          
          return (
            <Card 
              key={plan.id} 
              className={`border-none shadow-lg rounded-[2.5rem] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:scale-[1.01] bg-white relative
                ${plan.popular ? "ring-2 ring-indigo-600 ring-offset-2" : ""} 
                ${isCurrent ? "border border-emerald-200 bg-emerald-50/5" : ""}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 left-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-2">
                  <span className="flex items-center justify-center gap-1">
                    <Sparkles size={12} className="fill-white" />
                    Recommandé pour vous
                  </span>
                </div>
              )}

              <div>
                <CardHeader className={`p-8 pb-6 ${plan.popular ? "pt-12" : ""}`}>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">{plan.name}</CardTitle>
                    {isCurrent && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-lg">
                        Actif
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-slate-500 font-semibold mt-2 min-h-[48px]">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-6">
                  {/* Price info */}
                  <div className="border-b border-slate-100 pb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-950 tracking-tight">{plan.price}</span>
                      {plan.usdPrice !== "Custom" && (
                        <span className="text-sm text-slate-400 font-bold">({plan.usdPrice})</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{plan.period}</span>
                  </div>

                  {/* Features list */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inclus dans l'offre :</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm font-semibold">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                            ${plan.color === "blue" ? "bg-blue-50 text-blue-600" : plan.color === "indigo" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"}`}
                          >
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </div>

              <CardFooter className="p-8 pt-0">
                {isCurrent ? (
                  <Button 
                    disabled 
                    className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 disabled:opacity-100 h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-sm border-none"
                  >
                    <ShieldCheck size={16} /> Votre Forfait Actuel
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isPending}
                    className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 transition-all cursor-pointer shadow-md
                      ${plan.popular 
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:shadow-lg" 
                        : "bg-slate-900 text-white hover:bg-slate-800"}`}
                  >
                    {isUpgradingThis ? (
                      <span className="flex items-center gap-2">
                        <Clock className="animate-spin" size={16} />
                        Mise à niveau...
                      </span>
                    ) : (
                      <>
                        Activer ce forfait
                        <ArrowRight size={14} />
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Trust elements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200/40">
        {[
          { title: "Sécurité de bout en bout", desc: "Toutes vos transactions sont cryptées et sécurisées par des protocoles bancaires certifiés.", icon: ShieldCheck },
          { title: "Mise à niveau transparente", desc: "Vos données scolaires et de configuration existantes sont conservées à 100% lors des changements.", icon: TrendingUp },
          { title: "Délai de grâce & flexibilité", desc: "Bénéficiez de 15 jours de grâce après expiration pour renouveler sans aucune coupure de service.", icon: Clock }
        ].map((item, i) => (
          <div key={i} className="flex gap-4 p-6 rounded-[2rem] bg-white border border-slate-100/80 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <item.icon size={22} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
              <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
