import React, { useState, useEffect } from "react";
import type { GarageParams } from "@/lib/garage/types";
import type { Opening } from "@/lib/garage/openingSystem";
import type { HallMaterialProject, ProjectMaterialSettings } from "@/lib/materials/project";
import {
  FolderKanban,
  X,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
  Trash2,
  Copy,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export type ProjectStatus =
  | "new"
  | "processing"
  | "quote_sent"
  | "approved"
  | "in_production"
  | "assembly"
  | "completed";

export interface HallProjectRecord {
  id: string;
  code: string;
  name: string;
  customerName: string;
  company?: string;
  email: string;
  phone: string;
  city: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  version: string;
  params: GarageParams;
  templateId?: string;
  notes?: string;
  estimatedPriceEur?: number;
  openings?: Opening[];
  replacedWindowIds?: string[];
  materialSettings?: ProjectMaterialSettings;
  buildingObjects?: HallMaterialProject['buildingObjects'];
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  new: { label: "Nový dopyt", color: "text-sky-400", bg: "bg-sky-500/15", border: "border-sky-500/30" },
  processing: { label: "Spracováva sa", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  quote_sent: { label: "Ponuka odoslaná", color: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/30" },
  approved: { label: "Schválené", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  in_production: { label: "Vo výrobe", color: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  assembly: { label: "Montáž", color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
  completed: { label: "Dokončené", color: "text-slate-300", bg: "bg-slate-500/20", border: "border-slate-500/30" },
};

const STORAGE_KEY = "vbau_hall_projects_crm_v1";

interface ProjectsCrmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: GarageParams;
  activeTemplateId: string;
  currentProject?: HallMaterialProject;
  onLoadProject: (params: GarageParams, templateId?: string, project?: HallProjectRecord) => void;
}

export function ProjectsCrmModal({
  isOpen,
  onClose,
  currentParams,
  activeTemplateId,
  currentProject,
  onLoadProject,
}: ProjectsCrmModalProps) {
  const [projects, setProjects] = useState<HallProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Project Form State
  const [projectName, setProjectName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  // Load projects from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProjects(JSON.parse(saved));
      } else {
        // Sample default project
        const initial: HallProjectRecord[] = [
          {
            id: "proj-1",
            code: "HALA-2026-001",
            name: "Výrobná hala s administratívou — Považská Bystrica",
            customerName: "Ing. Michal Kováč",
            company: "Kovovýroba SK s.r.o.",
            email: "kovac@kovovyroba.sk",
            phone: "+421 905 123 456",
            city: "Považská Bystrica",
            status: "quote_sent",
            createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
            version: "v1.2",
            templateId: "vyrobna_hala",
            params: {
              ...currentParams,
              width: 16,
              length: 30,
              clearHeight: 6,
            },
            estimatedPriceEur: 142500,
            notes: "Zákazník požaduje prípravu na mostový žeriav 5t v poliach 2-4.",
          },
          {
            id: "proj-2",
            code: "HALA-2026-002",
            name: "Skladová hala pre logistiku — Trnava",
            customerName: "Peter Horváth",
            company: "LogisTrans a.s.",
            email: "horvath@logistrans.sk",
            phone: "+421 911 888 999",
            city: "Trnava",
            status: "new",
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            updatedAt: new Date().toISOString(),
            version: "v1.0",
            templateId: "skladovacia_hala",
            params: {
              ...currentParams,
              width: 15,
              length: 55,
              clearHeight: 6.15,
            },
            estimatedPriceEur: 238000,
            notes: "Vysokozdvižné regálové zakladanie, 2 sekcionálne brány 4x4.25m.",
          },
        ];
        setProjects(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch (e) {
      console.error("Failed to load projects from storage", e);
    }
  }, [isOpen]);

  const saveProjectsToStorage = (updated: HallProjectRecord[]) => {
    setProjects(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  if (!isOpen) return null;

  const handleSaveCurrentAsProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !customerName.trim()) {
      toast.error("Prosím vyplňte názov projektu a meno zákazníka.");
      return;
    }

    const nextNum = projects.length + 1;
    const code = `HALA-2026-${String(nextNum).padStart(3, "0")}`;

    const newRecord: HallProjectRecord = {
      id: `proj-${Date.now()}`,
      code,
      name: projectName.trim(),
      customerName: customerName.trim(),
      company: company.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: "v1.0",
      templateId: activeTemplateId,
      params: { ...currentParams },
      openings: currentProject?.openings?.map(opening => ({ ...opening })),
      replacedWindowIds: currentProject?.replacedWindowIds ? [...currentProject.replacedWindowIds] : undefined,
      materialSettings: currentProject?.materialSettings,
      buildingObjects: currentProject?.buildingObjects,
      notes: notes.trim() || undefined,
      estimatedPriceEur: Math.round(currentParams.width * currentParams.length * 240),
    };

    const updated = [newRecord, ...projects];
    saveProjectsToStorage(updated);
    setSelectedProjectId(newRecord.id);
    setIsCreatingNew(false);
    toast.success(`Projekt ${code} bol úspešne vytvorený a uložený!`);

    // Reset inputs
    setProjectName("");
    setCustomerName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setCity("");
    setNotes("");
  };

  const handleUpdateStatus = (projId: string, newStatus: ProjectStatus) => {
    const updated = projects.map((p) =>
      p.id === projId ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
    );
    saveProjectsToStorage(updated);
    toast.success(`Stav zákazky zmenený na: ${STATUS_CONFIG[newStatus].label}`);
  };

  const handleDeleteProject = (projId: string) => {
    const updated = projects.filter((p) => p.id !== projId);
    saveProjectsToStorage(updated);
    if (selectedProjectId === projId) {
      setSelectedProjectId(null);
    }
    toast.success("Projekt bol vymazaný.");
  };

  const handleLoadToConfigurator = (proj: HallProjectRecord) => {
    onLoadProject(proj.params, proj.templateId, proj);
    onClose();
    toast.success(`Projekt ${proj.code} bol načítaný do 3D konfigurátora!`);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      (p.company || "").toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-sky-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Správa projektov a zákazníkov (CRM)
                </h2>
                <span className="text-[10px] font-mono uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-bold">
                  {projects.length} Zákaziek
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ukladanie konfigurácií hál, história verzií, obchodné stavy a exporty
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setProjectName(`Hala ${currentParams.width}×${currentParams.length}m — nový projekt`);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Uložiť aktuálnu halu</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Project List & Filters */}
          <div className="w-full md:w-96 border-r border-white/10 bg-slate-950/60 p-4 flex flex-col min-h-0 shrink-0 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Hľadať projekt, zákazníka, mesto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-1 pb-1">
              {["all", "new", "quote_sent", "approved", "in_production"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                    statusFilter === st
                      ? "bg-sky-500 text-slate-950 border-sky-400"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {st === "all" ? "Všetky" : STATUS_CONFIG[st as ProjectStatus]?.label}
                </button>
              ))}
            </div>

            {/* Projects list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredProjects.map((p) => {
                const active = selectedProjectId === p.id;
                const st = STATUS_CONFIG[p.status];
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setIsCreatingNew(false);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer text-left space-y-1.5 ${
                      active
                        ? "bg-sky-500/15 border-sky-400 shadow-md"
                        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-sky-400">{p.code}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}
                      >
                        {st.label}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{p.customerName}</span>
                      <span className="font-mono text-slate-300 font-semibold">
                        {p.params.width}×{p.params.length}m
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-500">
                  Žiadne projekty nezodpovedajú vyhľadávaniu.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Project Detail or Create Form */}
          <div className="flex-1 bg-slate-950 p-6 overflow-y-auto">
            {isCreatingNew ? (
              /* Create New Project Form */
              <form onSubmit={handleSaveCurrentAsProject} className="max-w-2xl mx-auto space-y-5">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-400" />
                    Uložiť aktuálnu konfiguráciu haly ako nový projekt
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aktuálne rozmery: {currentParams.width} × {currentParams.length} × {currentParams.clearHeight} m (sklon {currentParams.roofPitchDeg}°)
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Názov projektu / zákazky *</label>
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="napr. Výrobná hala s administratívou — Nitra"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Meno zákazníka / kontaktnej osoby *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="napr. Ján Novák"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Spoločnosť / IČO</label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="napr. Priemstav s.r.o."
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@firma.sk"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Telefón</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+421 9..."
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Mesto / Miesto stavby</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="napr. Žilina"
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Poznámky k zákazke</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Špecifické požiadavky na podlahu, žeriavovú dráhu, svetlíky..."
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-4 py-2 rounded-lg border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/5 cursor-pointer"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg cursor-pointer"
                  >
                    Uložiť projekt
                  </button>
                </div>
              </form>
            ) : selectedProject ? (
              /* Selected Project Detail */
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Detail Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/30">
                        {selectedProject.code}
                      </span>
                      <span className="text-xs text-slate-400">Verzia: {selectedProject.version}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{selectedProject.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadToConfigurator(selectedProject)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow transition cursor-pointer"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span>Načítať do 3D</span>
                    </button>

                    <button
                      onClick={() => handleDeleteProject(selectedProject.id)}
                      className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/15 transition cursor-pointer"
                      title="Vymazať projekt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status Switcher */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400 font-semibold">Aktuálny obchodný stav:</span>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((stKey) => {
                      const st = STATUS_CONFIG[stKey];
                      const active = selectedProject.status === stKey;
                      return (
                        <button
                          key={stKey}
                          onClick={() => handleUpdateStatus(selectedProject.id, stKey)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                            active
                              ? `${st.bg} ${st.color} ${st.border} shadow`
                              : "border-transparent text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Grid: Customer Details & Hall Specs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Customer Info */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <h4 className="font-sans font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-sky-400">
                      <User className="h-3.5 w-3.5" />
                      Zákazník & Lokalita
                    </h4>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Meno:</span>
                        <span className="text-white font-bold">{selectedProject.customerName}</span>
                      </div>
                      {selectedProject.company && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Spoločnosť:</span>
                          <span className="text-slate-200">{selectedProject.company}</span>
                        </div>
                      )}
                      {selectedProject.phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Telefón:</span>
                          <span className="text-slate-200">{selectedProject.phone}</span>
                        </div>
                      )}
                      {selectedProject.email && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Email:</span>
                          <span className="text-slate-200">{selectedProject.email}</span>
                        </div>
                      )}
                      {selectedProject.city && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lokalita:</span>
                          <span className="text-slate-200">{selectedProject.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hall Parameters */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <h4 className="font-sans font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                      <Building className="h-3.5 w-3.5" />
                      Konštrukčné parametre
                    </h4>
                    <div className="space-y-1 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rozmery:</span>
                        <span className="text-white font-bold">
                          {selectedProject.params.width} × {selectedProject.params.length} × {selectedProject.params.clearHeight} m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Zastavaná plocha:</span>
                        <span className="text-slate-200 font-bold">
                          {selectedProject.params.width * selectedProject.params.length} m²
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sklon strechy:</span>
                        <span className="text-slate-200">{selectedProject.params.roofPitchDeg ?? 10}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Modul polí:</span>
                        <span className="text-slate-200">{selectedProject.params.bayCount} polí</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Orientačná cena:</span>
                        <span className="text-emerald-400 font-bold">
                          {selectedProject.estimatedPriceEur?.toLocaleString()} € bez DPH
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedProject.notes && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
                    <span className="text-slate-400 block font-semibold mb-1">Poznámka k zákazke:</span>
                    <p className="text-slate-200 leading-relaxed">{selectedProject.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              /* No Project Selected */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <FolderKanban className="h-12 w-12 text-slate-600" />
                <h4 className="text-base font-bold text-white">Vyberte projekt alebo uložte novú halu</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  V zozname vľavo zvoľte projekt pre zobrazenie detailu, zmenu obchodného stavu, alebo kliknite na &quot;Uložiť aktuálnu halu&quot;.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
