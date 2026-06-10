"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { saveBatchAttendance } from "@/domains/attendance/actions/attendance.actions";
import { Check, X, Clock, Info, Save, Scan, List, Search, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { AttendanceScanner } from "./AttendanceScanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
}

interface AttendanceGridProps {
  students: Student[];
  classId: number;
  subjectId?: number;
  employeeId?: number;
  date: string;
  initialRecords?: any[];
  canEdit?: boolean;
}

export default function AttendanceGrid({ students, classId, subjectId, employeeId, date, initialRecords = [], canEdit = true }: AttendanceGridProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendSMS, setSendSMS] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [records, setRecords] = useState<Record<number, { status: string; remark: string }>>(
    students.reduce((acc, s) => {
      const existing = initialRecords.find(r => r.studentId === s.id);
      acc[s.id] = {
        status: existing?.status || "Présent",
        remark: existing?.remark || "",
      };
      return acc;
    }, {} as any)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const eventSource = new EventSource("/api/attendance/stream");
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.classId === classId && (data.subjectId === subjectId || !subjectId)) {
           toast.info("Mise à jour en temps réel reçue");
        }
      } catch (err) {
        console.error("Failed to parse event data:", err);
      }
    };

    eventSource.onmessage = handleMessage;
    
    return () => {
      eventSource.close();
    };
  }, [classId, subjectId]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.nomEtudiant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numAdmission.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    const counts = { Presents: 0, Absents: 0, Lates: 0, Excused: 0 };
    Object.values(records).forEach(r => {
      if (r.status === "Présent") counts.Presents++;
      else if (r.status === "Absent") counts.Absents++;
      else if (r.status === "En Retard") counts.Lates++;
      else if (r.status === "Excusé") counts.Excused++;
    });
    return counts;
  }, [records]);

  const updateStatus = (studentId: number, status: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const updateRemark = (studentId: number, remark: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remark }
    }));
  };

  const markAllPresent = () => {
    const newRecords = { ...records };
    students.forEach(s => {
      newRecords[s.id] = { ...newRecords[s.id], status: "Présent" };
    });
    setRecords(newRecords);
    toast.success("Tous les élèves sont marqués présents");
  };

  const handleSubmit = async () => {
    setLoading(true);
    const data = {
      classId,
      subjectId: subjectId || null,
      employeeId: employeeId || null,
      date,
      records: Object.entries(records).map(([id, val]) => ({
        studentId: Number(id),
        status: val.status,
        remark: val.remark,
      })),
      sendSMS,
      sendWhatsApp,
    };

    const result = await saveBatchAttendance(data as any);
    setLoading(false);
    if (result.success) {
      toast.success("Présence enregistrée avec succès !");
    } else {
      toast.error("Erreur: " + result.error);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6">
          <TabsList className="bg-slate-100 p-1 rounded-2xl">
            <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2 flex gap-2">
              <List size={16} /> Liste
            </TabsTrigger>
            <TabsTrigger value="scanner" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 py-2 flex gap-2">
              <Scan size={16} /> Scanner Mode
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-6 pr-6 border-r border-slate-100">
               <div className="flex items-center space-x-2">
                <Switch id="sms-mode" checked={sendSMS} onCheckedChange={setSendSMS} />
                <Label htmlFor="sms-mode" className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                  <MessageSquare size={14} className={sendSMS ? "text-primary" : ""} /> SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="whatsapp-mode" checked={sendWhatsApp} onCheckedChange={setSendWhatsApp} />
                <Label htmlFor="whatsapp-mode" className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                  <Phone size={14} className={sendWhatsApp ? "text-emerald-500" : ""} /> WhatsApp
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1">
                Présents: {stats.Presents}
              </Badge>
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 px-3 py-1">
                Absents: {stats.Absents}
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 px-3 py-1">
                Retards: {stats.Lates}
              </Badge>
            </div>
          </div>
        </div>

        <TabsContent value="list" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Rechercher un élève..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl border-none bg-white shadow-sm h-11"
              />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={markAllPresent} 
                disabled={!canEdit}
                className="rounded-xl font-bold bg-white h-11 flex-1 md:flex-none disabled:opacity-50"
              >
                ✅ Tout Présent
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !canEdit} 
                className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-lg flex-1 md:flex-none items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Chargement..." : <><Save size={18} /> Enregistrer</>}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Matricule</th>
                    <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Élève</th>
                    <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Présence</th>
                    <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <span className="font-mono font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg">
                          {s.numAdmission || "-"}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900">{s.nomEtudiant}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-100/50 p-1.5 rounded-2xl w-fit mx-auto border border-slate-100">
                          {[
                            { val: "Présent", icon: Check, color: "bg-emerald-500", text: "text-emerald-500" },
                            { val: "Absent", icon: X, color: "bg-rose-500", text: "text-rose-500" },
                            { val: "En Retard", icon: Clock, color: "bg-amber-500", text: "text-amber-500" },
                            { val: "Excusé", icon: Info, color: "bg-blue-500", text: "text-blue-500" },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              onClick={() => canEdit && updateStatus(s.id, opt.val)}
                              disabled={!canEdit}
                              title={opt.val}
                              className={`flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all ${
                                records[s.id].status === opt.val
                                  ? `${opt.color} text-white shadow-lg scale-105`
                                  : "text-slate-400 hover:text-slate-600 hover:bg-white"
                                } ${!canEdit && "cursor-not-allowed opacity-80"}`}
                            >
                              <opt.icon size={16} strokeWidth={3} />
                              <span className="hidden md:inline ml-1.5">{opt.val}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Input
                          placeholder="..."
                          value={records[s.id].remark}
                          disabled={!canEdit}
                          onChange={(e) => updateRemark(s.id, e.target.value)}
                          className="rounded-xl border-slate-100 h-10 text-xs focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStudents.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                Aucun élève trouvé pour cette recherche.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scanner">
          <AttendanceScanner 
            classId={classId} 
            subjectId={subjectId} 
            employeeId={employeeId} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
