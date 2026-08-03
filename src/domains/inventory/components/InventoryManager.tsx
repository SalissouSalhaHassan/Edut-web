"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Package, Users, MapPin, AlertCircle, TrendingUp, Search, Plus, 
  Trash2, Settings, ArrowLeftRight, Check, X, RefreshCw, Layers, Sparkles
} from "lucide-react";
import { 
  getInventoryItems, 
  saveInventoryItem, 
  deleteInventoryItem, 
  getInventoryAssignments, 
  assignItem, 
  returnItem 
} from "@/domains/inventory/actions/inventory.actions";

interface InventoryManagerProps {
  initialItems?: any[];
  initialAssignments?: any[];
  initialEmployees?: any[];
}

export default function InventoryManager({
  initialItems = [],
  initialAssignments = [],
  initialEmployees = []
}: InventoryManagerProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [assignments, setAssignments] = useState<any[]>(initialAssignments);
  const [employees] = useState<any[]>(initialEmployees);

  const [activeTab, setActiveTab] = useState<"stock" | "assignments">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("Tous");

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [itemForm, setItemForm] = useState({
    id: 0,
    name: "",
    sku: "",
    quantity: 10,
    unitPrice: 50000,
    condition: "Neuf",
    location: "Stock Principal"
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    itemId: 0,
    itemName: "",
    employeeId: 0,
    assignedQty: 1
  });

  // Calculate Key Statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((acc, item) => acc + ((Number(item.unit_price || item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0);
    const assignedCount = assignments.filter((a) => a.status === "En possession").length;
    const lowStockCount = items.filter((i) => (Number(i.quantity) || 0) < 3).length;

    return { totalItems, totalValue, assignedCount, lowStockCount };
  }, [items, assignments]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        item.name?.toLowerCase().includes(q) || 
        item.sku?.toLowerCase().includes(q) || 
        item.location?.toLowerCase().includes(q);

      const matchCondition = conditionFilter === "Tous" || item.condition === conditionFilter;
      return matchQuery && matchCondition;
    });
  }, [items, searchQuery, conditionFilter]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fr-FR", { minimumFractionDigits: 0 }) + " F CFA";
  };

  // Re-fetch fresh data from server
  const refreshData = async () => {
    const itemsRes = await getInventoryItems() as any;
    const freshItems = itemsRes.data?.data || itemsRes.data || [];
    if (Array.isArray(freshItems)) setItems(freshItems);

    const assignRes = await getInventoryAssignments() as any;
    const freshAssigns = assignRes.data?.data || assignRes.data || [];
    if (Array.isArray(freshAssigns)) setAssignments(freshAssigns);
  };

  // Save / Update Item Handler
  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) {
      toast.error("Veuillez saisir le nom de l'article.");
      return;
    }

    const payload = {
      name: itemForm.name,
      sku: itemForm.sku,
      quantity: Number(itemForm.quantity) || 0,
      unitPrice: Number(itemForm.unitPrice) || 0,
      condition: itemForm.condition,
      location: itemForm.location,
    };

    const res = await saveInventoryItem(payload, isEditing ? itemForm.id : undefined) as any;
    if (res.success || res.data?.success) {
      toast.success(isEditing ? "Article modifié avec succès !" : "Article ajouté au stock avec succès !");
      setShowItemModal(false);
      await refreshData();
    } else {
      toast.error(res.error || "Erreur lors de l'enregistrement de l'article.");
    }
  };

  // Delete Item Handler
  const handleDeleteItem = async (id: number, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${name} de l'inventaire ?`)) {
      const res = await deleteInventoryItem(id) as any;
      if (res.success || res.data?.success) {
        toast.success("Article supprimé de l'inventaire.");
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        toast.error("Erreur lors de la suppression.");
      }
    }
  };

  // Assign Item Handler
  const handleAssignItem = async () => {
    if (!assignForm.itemId) {
      toast.error("Veuillez sélectionner un article.");
      return;
    }

    const res = await assignItem({
      itemId: assignForm.itemId,
      employeeId: Number(assignForm.employeeId) || undefined,
      assignedQty: Number(assignForm.assignedQty) || 1
    }) as any;

    if (res.success || res.data?.success) {
      toast.success("Matériel affecté avec succès !");
      setShowAssignModal(false);
      await refreshData();
    } else {
      toast.error(res.error || res.data?.error || "Erreur lors de l'affectation.");
    }
  };

  // Return Item Handler
  const handleReturnItem = async (assignmentId: number) => {
    if (confirm("Confirmer la restitution de cet article au stock ?")) {
      const res = await returnItem(assignmentId) as any;
      if (res.success || res.data?.success) {
        toast.success("Article restitué au stock avec succès !");
        await refreshData();
      } else {
        toast.error(res.error || "Erreur lors de la restitution.");
      }
    }
  };

  return (
    <div className="p-8 md:p-10 space-y-8 animate-in fade-in duration-500 bg-slate-50/50 dark:bg-[#0A0C10] min-h-screen">
      {/* Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#131622] p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-black">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Inventaire & Gestion du Stock</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs md:text-sm font-semibold">
                Contrôle centralisé du matériel scolaire, des équipements et des affectations au personnel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setIsEditing(false);
              setItemForm({
                id: 0,
                name: "",
                sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                quantity: 10,
                unitPrice: 50000,
                condition: "Neuf",
                location: "Stock Principal"
              });
              setShowItemModal(true);
            }}
            className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-indigo-600/20 dark:shadow-none"
          >
            <Plus size={18} /> + Ajouter au Stock
          </Button>
        </div>
      </div>

      {/* Analytics KPI Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Total Articles */}
        <div className="bg-white dark:bg-[#131622] p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Package size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Articles Total</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalItems}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Références enregistrées</p>
          </div>
        </div>

        {/* Card 2: Estimated Value */}
        <div className="bg-white dark:bg-[#131622] p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Valeur Estimée</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(stats.totalValue)}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Valeur globale du matériel</p>
          </div>
        </div>

        {/* Card 3: Assigned Items */}
        <div className="bg-white dark:bg-[#131622] p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Matériel Assigné</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.assignedCount}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">En possession du personnel</p>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white dark:bg-[#131622] p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Alerte Stock Bas</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.lowStockCount}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Moins de 3 unités restantes</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="space-y-6">
        <div className="bg-slate-200/60 dark:bg-slate-900 p-1.5 rounded-2xl w-fit flex gap-2 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-6 h-12 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === "stock"
                ? "bg-white dark:bg-[#0E1017] text-indigo-600 dark:text-indigo-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Package size={16} /> Stock Principal ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`px-6 h-12 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === "assignments"
                ? "bg-white dark:bg-[#0E1017] text-indigo-600 dark:text-indigo-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users size={16} /> Affectations & Prêts ({assignments.length})
          </button>
        </div>

        {/* TAB 1: STOCK MANAGEMENT */}
        {activeTab === "stock" && (
          <div className="space-y-6">
            {/* Search & Condition Filter Toolbar */}
            <div className="bg-white dark:bg-[#131622] p-6 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher par article, SKU, salle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-12 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">État:</span>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                >
                  <option value="Tous">Tous les états</option>
                  <option value="Neuf">Neuf</option>
                  <option value="Bon état">Bon état</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Endommagé">Endommagé</option>
                </select>
              </div>
            </div>

            {/* Stock Items Table */}
            <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-5">Article & SKU</th>
                    <th className="px-6 py-5">Prix Unitaire</th>
                    <th className="px-6 py-5 text-center">Quantité Stock</th>
                    <th className="px-6 py-5">Emplacement</th>
                    <th className="px-6 py-5 text-center">État</th>
                    <th className="px-6 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold">
                        Aucun matériel trouvé dans l'inventaire.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                        <td className="px-6 py-5">
                          <p className="font-extrabold text-slate-900 dark:text-white text-base">{item.name}</p>
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-black uppercase tracking-wider">{item.sku || "SKU-N/A"}</p>
                        </td>
                        <td className="px-6 py-5 text-slate-900 dark:text-white font-mono font-bold">
                          {formatCurrency(Number(item.unit_price || item.unitPrice) || 0)}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full font-black text-sm ${
                            (Number(item.quantity) || 0) === 0 ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400" :
                            (Number(item.quantity) || 0) < 3 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                          }`}>
                            {item.quantity ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                            <MapPin size={15} className="text-slate-400 dark:text-slate-500" />
                            {item.location || "Stock Principal"}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.condition === "Neuf" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                            item.condition === "Endommagé" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400" :
                            "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                          }`}>
                            {item.condition || "Neuf"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => {
                                setAssignForm({
                                  itemId: item.id,
                                  itemName: item.name,
                                  employeeId: employees[0]?.id || 0,
                                  assignedQty: 1
                                });
                                setShowAssignModal(true);
                              }}
                              className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center border border-amber-200 dark:border-amber-500/20"
                              title="Affecter à un membre du personnel"
                            >
                              <ArrowLeftRight size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setItemForm({
                                  id: item.id,
                                  name: item.name,
                                  sku: item.sku || "",
                                  quantity: item.quantity || 0,
                                  unitPrice: item.unit_price || item.unitPrice || 0,
                                  condition: item.condition || "Neuf",
                                  location: item.location || "Stock Principal"
                                });
                                setShowItemModal(true);
                              }}
                              className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20"
                              title="Modifier Article"
                            >
                              <Settings size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 dark:hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-rose-200 dark:border-rose-500/20"
                              title="Supprimer Article"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENTS MANAGEMENT */}
        {activeTab === "assignments" && (
          <div className="bg-white dark:bg-[#131622] rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-5">Article Confié</th>
                  <th className="px-6 py-5">Employé / Bénéficiaire</th>
                  <th className="px-6 py-5 text-center">Quantité Prêtée</th>
                  <th className="px-6 py-5 text-center">Statut</th>
                  <th className="px-6 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-bold text-slate-700 dark:text-slate-200">
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500 font-bold">
                      Aucune affectation de matériel enregistrée.
                    </td>
                  </tr>
                ) : (
                  assignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="px-6 py-5 font-black text-slate-900 dark:text-white">
                        {assign.item_name || assign.item?.name || "Matériel Consigné"}
                      </td>
                      <td className="px-6 py-5 text-indigo-600 dark:text-indigo-400 font-extrabold">
                        {assign.employee_nom 
                          ? `${assign.employee_prenom || ''} ${assign.employee_nom}` 
                          : assign.employee?.nom || "Personnel Scolaire"}
                      </td>
                      <td className="px-6 py-5 text-center font-mono font-black text-base text-slate-900 dark:text-white">
                        {assign.assigned_qty || assign.assignedQty || 1}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          assign.status === "Retourné" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}>
                          {assign.status || "En possession"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {assign.status !== "Retourné" && (
                          <Button
                            onClick={() => handleReturnItem(assign.id)}
                            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                          >
                            <RefreshCw size={14} /> Restituer au Stock
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: ADD / EDIT INVENTORY ITEM ─── */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1017] text-slate-900 dark:text-white rounded-[2.5rem] border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowItemModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {isEditing ? "Modifier le Matériel" : "Ajouter un Article au Stock"}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Renseignez les détails du matériel scolaire.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Désignation du Matériel *</label>
                <input 
                  type="text"
                  placeholder="Ex: Ordinateur HP ProBook"
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Code SKU</label>
                  <input 
                    type="text"
                    placeholder="EQUIP-001"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Quantité Initial</label>
                  <input 
                    type="number"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: Number(e.target.value) || 0 }))}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Prix Unitaire (F CFA)</label>
                  <input 
                    type="number"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unitPrice: Number(e.target.value) || 0 }))}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">État de l'Article</label>
                  <select
                    value={itemForm.condition}
                    onChange={(e) => setItemForm(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Neuf">Neuf</option>
                    <option value="Bon état">Bon état</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Endommagé">Endommagé</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Emplacement / Salle</label>
                <input 
                  type="text"
                  placeholder="Ex: Salle Informatique 1"
                  value={itemForm.location}
                  onChange={(e) => setItemForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setShowItemModal(false)}
                className="h-12 px-5 font-bold text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveItem}
                className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-600/20 dark:shadow-none"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ASSIGN ITEM TO STAFF ─── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1017] text-slate-900 dark:text-white rounded-[2.5rem] border border-slate-200 dark:border-slate-800 max-w-md w-full p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAssignModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Affecter du Matériel</h3>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">{assignForm.itemName}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Bénéficiaire / Employé</label>
                {employees.length > 0 ? (
                  <select
                    value={assignForm.employeeId}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, employeeId: Number(e.target.value) || 0 }))}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.prenom ? `${emp.prenom} ${emp.nom}` : emp.nom} ({emp.role || 'Personnel'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Nom du membre du personnel"
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Quantité à Consigner</label>
                <input 
                  type="number"
                  min="1"
                  value={assignForm.assignedQty}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, assignedQty: Number(e.target.value) || 1 }))}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost" 
                onClick={() => setShowAssignModal(false)}
                className="h-12 px-5 font-bold text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleAssignItem}
                className="h-12 px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-amber-600/20 dark:shadow-none"
              >
                Valider l'Affectation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
