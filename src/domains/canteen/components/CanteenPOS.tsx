"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { processCanteenPurchase, rechargeWallet, getStudentWallet } from "@/domains/canteen/actions/canteen.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { Search, ShoppingCart, CreditCard, Trash2, User, Wallet, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";

interface CanteenPOSProps {
  items: any[];
}

export default function CanteenPOS({ items }: CanteenPOSProps) {
  const [cart, setCart] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentBalance, setStudentBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 2) {
      getStudents().then((res: any) => {
        const data = res.data?.data || res.data || [];
        const filtered = data.filter((s: any) => 
          s.nomEtudiant?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          s.matricule?.includes(searchQuery)
        );
        setStudentsList(filtered);
      });
    } else {
      setStudentsList([]);
    }
  }, [searchQuery]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchQuery("");
    setStudentsList([]);
    const res = await getStudentWallet(student.id) as any;
    const wallet = res.data?.data || res.data;
    setStudentBalance(wallet?.balance || 0);
  };

  const handleCheckout = async () => {
    if (!selectedStudent || cart.length === 0) return;
    if (studentBalance < total) return;

    setLoading(true);
    const itemsDesc = cart.map(i => `${i.qty}x ${i.name}`).join(", ");
    const res = await processCanteenPurchase(selectedStudent.id, total, itemsDesc) as any;
    
    if (res.success || res.data?.success) {
      const balance = res.balance ?? res.data?.balance;
      setStudentBalance(balance || 0);
      setCart([]);
      alert("Achat validé !");
    } else {
      alert(res.error || "Erreur lors de l'achat");
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)]">
      {/* Items Area */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
           <Search className="text-slate-300" />
           <Input placeholder="Rechercher un produit..." className="border-none shadow-none text-lg font-medium" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 scrollbar-hide">
          {items.map((item) => (
            <button 
              key={item.id}
              onClick={() => addToCart(item)}
              className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-primary/20 hover:shadow-xl hover:shadow-indigo-50 transition-all text-left flex flex-col justify-between h-48"
            >
              <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all w-fit">
                 <Sparkles size={20} />
              </div>
              <div>
                <p className="font-black text-slate-900 text-lg leading-tight mb-1">{item.name}</p>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
              </div>
              <p className="text-xl font-black text-primary">{item.price.toLocaleString()} <span className="text-[10px] uppercase">CFA</span></p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart & Student Area */}
      <div className="lg:col-span-4 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 space-y-6">
          <div className="relative">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Client (Élève)</Label>
            <div className="relative">
               <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scanner ou Rechercher..." 
                className="pl-12 rounded-2xl h-12 bg-white border-slate-200" 
               />
            </div>
            
            {studentsList.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-60 overflow-y-auto">
                {studentsList.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => handleSelectStudent(s)}
                    className="w-full p-4 text-left hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0"
                  >
                    <p className="font-bold text-slate-900">{s.nomEtudiant}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.classe}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="p-6 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 animate-in zoom-in duration-300">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Portefeuille</p>
                    <p className="font-bold text-lg">{selectedStudent.nomEtudiant}</p>
                  </div>
                  <Wallet size={24} className="opacity-60" />
               </div>
               <p className="text-3xl font-black">{studentBalance.toLocaleString()} <span className="text-sm font-bold opacity-60 uppercase">CFA</span></p>
            </div>
          )}
        </div>

        <div className="flex-grow p-8 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-black text-slate-900 flex items-center gap-2">
               <ShoppingCart size={18} className="text-primary" /> Panier
             </h3>
             <button onClick={() => setCart([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Vider</button>
          </div>
          
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                 <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">{item.qty}</span>
                 <div>
                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.price.toLocaleString()} CFA</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <p className="font-black text-slate-900 text-sm">{(item.price * item.qty).toLocaleString()}</p>
                 <button onClick={() => removeFromCart(item.id)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all">
                    <Trash2 size={14} />
                 </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-20 text-center">
               <ShoppingCart className="mx-auto text-slate-100 mb-4" size={48} />
               <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Panier Vide</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-6">
          <div className="flex justify-between items-center">
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total</p>
             <p className="text-3xl font-black text-slate-900">{total.toLocaleString()} <span className="text-sm font-bold text-slate-400 uppercase">CFA</span></p>
          </div>
          <Button 
            disabled={!selectedStudent || cart.length === 0 || studentBalance < total || loading}
            onClick={handleCheckout}
            className="w-full h-16 rounded-3xl bg-primary text-white hover:bg-primary/90 font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            {loading ? "Traitement..." : studentBalance < total ? "Solde Insuffisant" : (
              <><CreditCard size={20} /> Valider l'Achat</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
