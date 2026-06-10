"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Package, 
  Search, 
  Tag, 
  CheckCircle2,
  XCircle,
  ArrowRight
} from "lucide-react";

const PRODUCTS = [
  { id: 1, name: "Sandwich Mixte", price: 250, category: "Snack" },
  { id: 2, name: "Jus d'Orange 33cl", price: 150, category: "Boisson" },
  { id: 3, name: "Eau Minérale 0.5L", price: 50, category: "Boisson" },
  { id: 4, name: "Pizza Portion", price: 180, category: "Snack" },
  { id: 5, name: "Croissant", price: 80, category: "Viennoiserie" },
  { id: 6, name: "Yaourt aux fruits", price: 60, category: "Laitage" },
];

export default function POSPage() {
  const [cart, setCart] = useState<{ id: number; name: string; price: number; quantity: number }[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: typeof PRODUCTS[0]) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    alert(`Paiement réussi ! Total : ${total} DA ${!isOnline ? "(Enregistré hors-ligne)" : ""}`);
    setCart([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-fade-in-up">
      {/* Header Bar */}
      <div className="px-8 py-5 flex justify-between items-center bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
            <ShoppingCart size={20} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Point de Vente Cantine</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors ${
            isOnline ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
          }`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "En Ligne" : "Hors Ligne"}
          </div>
          <button 
            onClick={() => setCart([])}
            className="text-slate-400 hover:text-rose-500 transition-colors p-2"
            title="Vider le panier"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-8 gap-8">
        {/* Left: Product Catalog */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Search & Tabs */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un produit..." 
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border-none outline-none text-sm font-semibold shadow-sm focus:ring-2 ring-primary/20 transition-all"
              />
            </div>
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              <button className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold transition-all shadow-lg shadow-primary/25">Tous</button>
              <button className="px-5 py-2.5 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all">Snacks</button>
              <button className="px-5 py-2.5 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all">Boissons</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
              {PRODUCTS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((product) => (
                <div 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group relative bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-[3rem] group-hover:bg-primary/5 transition-colors" />
                  <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                        <Package size={20} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{product.category}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{product.name}</h3>
                    <p className="text-xl font-black text-slate-900 mt-2">{product.price} <span className="text-[10px] font-bold">DA</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Modern Cart UI */}
        <div className="w-[450px] bg-slate-900 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px]" />
          
          <div className="p-10 pb-6 relative z-10">
            <div className="flex justify-between items-end">
              <h2 className="text-2xl font-black text-white tracking-tight">Votre Panier</h2>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-widest">{cart.length} articles</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-10 space-y-4 relative z-10 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-40">
                <ShoppingCart size={80} strokeWidth={1} />
                <p className="mt-4 font-bold">Panier Vide</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="group p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-xs text-white">
                      x{item.quantity}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.price} DA / unité</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-black text-white">{item.price * item.quantity} DA</p>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-slate-600 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-10 pt-6 bg-black/20 backdrop-blur-2xl relative z-10">
            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-slate-400 text-sm font-bold uppercase tracking-wider">
                <span>Sous-total</span>
                <span>{total} DA</span>
              </div>
              <div className="flex justify-between text-slate-400 text-sm font-bold uppercase tracking-wider">
                <span>TVA (0%)</span>
                <span>0 DA</span>
              </div>
              <div className="h-px bg-white/5 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Total à payer</span>
                <span className="text-4xl font-black text-white">{total} <span className="text-sm font-normal text-slate-400">DA</span></span>
              </div>
            </div>

            <Button 
              className="w-full h-16 rounded-[24px] bg-primary hover:bg-indigo-700 text-lg font-black shadow-2xl shadow-primary/40 transition-all hover:scale-[1.02] active:scale-95 group"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              CONFIRMER LE PAIEMENT <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <p className="text-center text-[10px] text-slate-600 mt-6 font-bold uppercase tracking-widest">
              Générer facture thermique après confirmation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
