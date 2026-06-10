"use client";

import React, { useState, useTransition } from "react";
import { 
  Users, Search, Shield, ShieldCheck, Mail, 
  MoreHorizontal, Edit, Trash2, Globe, UserCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteUser } from "@/domains/auth/actions/users.actions";
import UserDialog from "./UserDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserManagerProps {
  initialUsers: any[];
  roles: any[];
  currentUser: any;
  schools?: any[];
}

export default function UserManager({ initialUsers, roles, currentUser, schools = [] }: UserManagerProps) {
  const [usersList, setUsersList] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingUser, setEditingUser] = useState<any>(null);

  const filteredUsers = usersList.filter(u => 
    u.utilisateur.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nomPrenom?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet utilisateur ?")) return { success: false };
    const res = await deleteUser(id);
    if (res.success) {
      setUsersList(prev => prev.filter(u => u.id !== id));
      toast.success("Utilisateur supprimé");
      return { success: true };
    } else {
      toast.error("Erreur lors de la suppression");
      return { success: false };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden UserDialog for editing */}
      <UserDialog 
        user={editingUser} 
        roles={roles} 
        schools={schools}
        currentUser={currentUser}
        onSuccess={() => window.location.reload()} 
        openOverride={!!editingUser}
        onOpenChangeOverride={(open) => !open && setEditingUser(null)}
      />

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <Input 
            placeholder="Rechercher par nom ou identifiant..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-2xl border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
          />
        </div>
        <UserDialog roles={roles} schools={schools} currentUser={currentUser} onSuccess={() => window.location.reload()} />
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredUsers.map((user) => (
          <div key={user.id} className="group bg-white rounded-[2.5rem] border border-slate-100 p-1 flex flex-col shadow-sm hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 relative overflow-hidden">
            <div className="bg-slate-50/50 rounded-[2.2rem] p-7 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 text-indigo-600 flex items-center justify-center font-black text-2xl shadow-sm group-hover:scale-110 transition-transform duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {user.nomPrenom?.charAt(0).toUpperCase() || user.utilisateur.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight leading-tight text-lg">{user.nomPrenom || user.utilisateur}</h4>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">@{user.utilisateur}</span>
                    </div>
                  </div>
                </div>
                <ActionMenu 
                  title={`Gérer @${user.utilisateur}`}
                  onDelete={() => handleDelete(user.id)}
                  onEdit={() => setEditingUser(user)}
                />
              </div>

              <div className="space-y-4 flex-grow">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-none ${user.admin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 shadow-sm border border-slate-100'}`}>
                    {user.admin ? 'Administrateur' : 'Membre'}
                  </Badge>
                  {user.superAdmin ? (
                    <Badge variant="outline" className="rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-rose-200 bg-rose-50 text-rose-600">
                      <Shield size={10} className="mr-1.5 text-rose-500" /> Super Admin
                    </Badge>
                  ) : user.role ? (
                    <Badge variant="outline" className="rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white text-slate-500">
                      <Shield size={10} className="mr-1.5 text-indigo-500" /> {user.role.roleName}
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Niveau</p>
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe size={12} className="text-indigo-400" />
                      {user.educationalLevel || "Primaire"}
                    </div>
                  </div>
                  {currentUser?.superAdmin && user.school ? (
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">École</p>
                      <div className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5" title={user.school.name}>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {user.school.name}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Langue</p>
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-4 h-3 bg-slate-100 rounded-[2px] flex items-center justify-center text-[8px]">{user.langue}</span>
                        {user.langue === "FR" ? "Français" : user.langue === "AR" ? "العربية" : "English"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accès Actif</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 italic">
                    {user.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: fr }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-600 opacity-[0.02] rounded-full group-hover:scale-150 transition-transform duration-1000" />
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="py-24 text-center bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-200">
          <div className="p-8 bg-white rounded-full shadow-sm w-fit mx-auto mb-6">
            <Users size={64} className="text-slate-200" />
          </div>
          <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Aucun utilisateur</h3>
          <p className="text-slate-400 mt-2 font-medium">Les utilisateurs créés apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
