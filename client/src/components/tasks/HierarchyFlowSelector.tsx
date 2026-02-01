import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Target,
    FileText,
    Layers,
    FolderKanban,
    ListChecks,
    Check,
    ChevronRight,
    Link2,
    Sparkles,
} from "lucide-react";

// Level configuration
const LEVELS = [
    { name: "Obiectiv", icon: Target, gradient: "from-violet-500 to-purple-600", bgGradient: "from-violet-500/20 to-purple-600/20", border: "border-violet-400", ring: "ring-violet-500" },
    { name: "Terv", icon: FileText, gradient: "from-blue-500 to-cyan-500", bgGradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-400", ring: "ring-blue-500" },
    { name: "Program", icon: Layers, gradient: "from-emerald-500 to-teal-500", bgGradient: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-400", ring: "ring-emerald-500" },
    { name: "Proiect", icon: FolderKanban, gradient: "from-amber-500 to-orange-500", bgGradient: "from-amber-500/20 to-orange-500/20", border: "border-amber-400", ring: "ring-amber-500" },
    { name: "De făcut", icon: ListChecks, gradient: "from-rose-500 to-pink-500", bgGradient: "from-rose-500/20 to-pink-500/20", border: "border-rose-400", ring: "ring-rose-500" },
];

export interface HierarchyFlowResult {
    mode: "existing" | "new";
    // For existing mode
    subgoalId?: string;
    planId?: string;
    programId?: string;
    projectId?: string;
    // For new mode - items to create
    newSubgoal?: string;
    newPlan?: string;
    newProgram?: string;
    newProject?: string;
    // Final hierarchy level and parent
    hierarchyLevel: string;
    parentItemId: string;
}

interface HierarchyFlowSelectorProps {
    departmentId: string;
    idealScene: any[];
    onSelectionComplete: (result: HierarchyFlowResult) => void;
    onCreatingChange?: (isCreating: boolean) => void;
}

export function HierarchyFlowSelector({
    departmentId,
    idealScene,
    onSelectionComplete,
    onCreatingChange,
}: HierarchyFlowSelectorProps) {
    const [mode, setMode] = useState<"existing" | "new" | null>(null);

    // Existing mode state
    const [selectedSubgoalId, setSelectedSubgoalId] = useState("");
    const [selectedLevel, setSelectedLevel] = useState<"plan" | "program" | "project" | null>(null);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [createNewAtLevel, setCreateNewAtLevel] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState("");

    // New mode state - mandatory items
    const [newSubgoal, setNewSubgoal] = useState("");
    const [newPlan, setNewPlan] = useState("");
    const [newProgram, setNewProgram] = useState("");
    // Optional
    const [newProject, setNewProject] = useState("");
    const [includeProject, setIncludeProject] = useState(false);

    // Get subgoals for department
    const getSubgoals = () => {
        if (!idealScene || idealScene.length === 0 || !departmentId) return [];
        const mainGoal = idealScene[0];
        if (!mainGoal?.subgoals) return [];
        return mainGoal.subgoals.filter((s: any) => s.departmentId === departmentId);
    };

    const subgoals = getSubgoals();

    // Get items at selected level
    const getItemsAtLevel = () => {
        if (!selectedSubgoalId || !selectedLevel) return [];
        const subgoal = subgoals.find((s: any) => s.id === selectedSubgoalId);
        if (!subgoal) return [];

        if (selectedLevel === "plan") {
            return subgoal.plans || [];
        } else if (selectedLevel === "program") {
            // Get all programs from all plans
            const programs: any[] = [];
            subgoal.plans?.forEach((plan: any) => {
                plan.programs?.forEach((program: any) => {
                    programs.push({ ...program, planTitle: plan.title, planId: plan.id });
                });
            });
            return programs;
        } else if (selectedLevel === "project") {
            // Get all projects from all programs
            const projects: any[] = [];
            subgoal.plans?.forEach((plan: any) => {
                plan.programs?.forEach((program: any) => {
                    program.projects?.forEach((project: any) => {
                        projects.push({ ...project, programTitle: program.title, programId: program.id, planId: plan.id });
                    });
                });
            });
            return projects;
        }
        return [];
    };

    const itemsAtLevel = getItemsAtLevel();

    // Check if selection is complete
    useEffect(() => {
        if (mode === "existing" && selectedSubgoalId && selectedLevel) {
            if (createNewAtLevel && newItemTitle.trim()) {
                // Creating new item at level
                onSelectionComplete({
                    mode: "existing",
                    subgoalId: selectedSubgoalId,
                    hierarchyLevel: selectedLevel.toUpperCase(),
                    parentItemId: selectedSubgoalId, // Will need parent based on level
                    newPlan: selectedLevel === "plan" ? newItemTitle : undefined,
                    newProgram: selectedLevel === "program" ? newItemTitle : undefined,
                    newProject: selectedLevel === "project" ? newItemTitle : undefined,
                });
                onCreatingChange?.(true);
            } else if (selectedItemId) {
                // Using existing item
                onSelectionComplete({
                    mode: "existing",
                    subgoalId: selectedSubgoalId,
                    planId: selectedLevel === "plan" ? selectedItemId : undefined,
                    programId: selectedLevel === "program" ? selectedItemId : undefined,
                    projectId: selectedLevel === "project" ? selectedItemId : undefined,
                    hierarchyLevel: selectedLevel.toUpperCase(),
                    parentItemId: selectedItemId,
                });
                onCreatingChange?.(false);
            }
        } else if (mode === "new" && newSubgoal.trim() && newPlan.trim() && newProgram.trim()) {
            onSelectionComplete({
                mode: "new",
                newSubgoal: newSubgoal.trim(),
                newPlan: newPlan.trim(),
                newProgram: newProgram.trim(),
                newProject: includeProject && newProject.trim() ? newProject.trim() : undefined,
                hierarchyLevel: includeProject && newProject.trim() ? "PROJECT" : "PROGRAM",
                parentItemId: "", // Will be created
            });
            onCreatingChange?.(true);
        }
    }, [mode, selectedSubgoalId, selectedLevel, selectedItemId, createNewAtLevel, newItemTitle,
        newSubgoal, newPlan, newProgram, newProject, includeProject]);

    // Reset when department changes
    useEffect(() => {
        setMode(null);
        setSelectedSubgoalId("");
        setSelectedLevel(null);
        setSelectedItemId("");
        setCreateNewAtLevel(false);
        setNewItemTitle("");
        setNewSubgoal("");
        setNewPlan("");
        setNewProgram("");
        setNewProject("");
        setIncludeProject(false);
    }, [departmentId]);

    if (!departmentId) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Selectează departamentul</p>
            </div>
        );
    }

    // Mode selection
    if (!mode) {
        return (
            <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground mb-3">
                    Cum vrei să atașezi sarcina?
                </div>

                <button
                    className={cn(
                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                        "hover:border-blue-500 hover:bg-blue-500/10",
                        "border-border/50 bg-card/50"
                    )}
                    onClick={() => setMode("existing")}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Link2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold">🔗 Ierarhie existentă</div>
                            <div className="text-sm text-muted-foreground">
                                Conectează-te la un obiectiv și lant existent
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                    </div>
                </button>

                <button
                    className={cn(
                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                        "hover:border-violet-500 hover:bg-violet-500/10",
                        "border-border/50 bg-card/50"
                    )}
                    onClick={() => setMode("new")}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="font-semibold">✨ Ierarhie nouă</div>
                            <div className="text-sm text-muted-foreground">
                                Creează un nou obiectiv, terv și program
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
                    </div>
                </button>
            </div>
        );
    }

    // Mode A: Existing hierarchy
    if (mode === "existing") {
        return (
            <div className="space-y-4">
                <button
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => {
                        setMode(null);
                        setSelectedSubgoalId("");
                        setSelectedLevel(null);
                        setSelectedItemId("");
                    }}
                >
                    ← Înapoi
                </button>

                {/* Step 1: Select Obiectiv */}
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                        Selectează Obiectiv *
                    </label>
                    {subgoals.length === 0 ? (
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm">
                            Nu există obiective pentru acest departament. Folosește "Ierarhie nouă" pentru a crea.
                        </div>
                    ) : (
                        <select
                            value={selectedSubgoalId}
                            onChange={(e) => {
                                setSelectedSubgoalId(e.target.value);
                                setSelectedLevel(null);
                                setSelectedItemId("");
                            }}
                            className="w-full px-3 py-2 rounded-lg border bg-background"
                        >
                            <option value="">Alege obiectivul...</option>
                            {subgoals.map((sg: any) => (
                                <option key={sg.id} value={sg.id}>
                                    🎯 {sg.title}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Step 2: Select Level */}
                {selectedSubgoalId && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                            La ce nivel atașezi? *
                        </label>
                        <div className="flex gap-2">
                            {(["plan", "program", "project"] as const).map((level) => {
                                const config = level === "plan" ? LEVELS[1] : level === "program" ? LEVELS[2] : LEVELS[3];
                                const Icon = config.icon;
                                return (
                                    <button
                                        key={level}
                                        className={cn(
                                            "flex-1 p-3 rounded-lg border-2 transition-all",
                                            selectedLevel === level
                                                ? `bg-gradient-to-br ${config.bgGradient} ${config.border}`
                                                : "border-border/50 hover:border-border"
                                        )}
                                        onClick={() => {
                                            setSelectedLevel(level);
                                            setSelectedItemId("");
                                            setCreateNewAtLevel(false);
                                        }}
                                    >
                                        <Icon className={cn("h-5 w-5 mx-auto mb-1", selectedLevel === level ? "text-foreground" : "text-muted-foreground")} />
                                        <div className="text-xs font-medium">{config.name}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Select or Create Item */}
                {selectedSubgoalId && selectedLevel && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                            Selectează sau creează *
                        </label>

                        <div className="flex gap-2 mb-2">
                            <button
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                                    !createNewAtLevel ? "bg-primary text-primary-foreground" : "border-border hover:border-border"
                                )}
                                onClick={() => setCreateNewAtLevel(false)}
                            >
                                Existent
                            </button>
                            <button
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                                    createNewAtLevel ? "bg-primary text-primary-foreground" : "border-border hover:border-border"
                                )}
                                onClick={() => setCreateNewAtLevel(true)}
                            >
                                + Nou
                            </button>
                        </div>

                        {createNewAtLevel ? (
                            <input
                                type="text"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder={`Numele ${LEVELS[selectedLevel === "plan" ? 1 : selectedLevel === "program" ? 2 : 3].name}...`}
                                className="w-full px-3 py-2 rounded-lg border bg-background"
                                autoFocus
                            />
                        ) : itemsAtLevel.length === 0 ? (
                            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm">
                                Nu există {LEVELS[selectedLevel === "plan" ? 1 : selectedLevel === "program" ? 2 : 3].name} la acest obiectiv. Creează unul nou.
                            </div>
                        ) : (
                            <select
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border bg-background"
                            >
                                <option value="">Alege...</option>
                                {itemsAtLevel.map((item: any) => (
                                    <option key={item.id} value={item.id}>
                                        {item.title}
                                        {item.planTitle && ` (${item.planTitle})`}
                                        {item.programTitle && ` (${item.programTitle})`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {/* Selection Summary */}
                {((selectedItemId) || (createNewAtLevel && newItemTitle.trim())) && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-500 font-medium">
                            Ierarhie selectată!
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // Mode B: New hierarchy chain
    return (
        <div className="space-y-4">
            <button
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => {
                    setMode(null);
                    setNewSubgoal("");
                    setNewPlan("");
                    setNewProgram("");
                    setNewProject("");
                    setIncludeProject(false);
                }}
            >
                ← Înapoi
            </button>

            <div className="text-sm text-muted-foreground mb-2">
                Creează o ierarhie nouă (obligatorii marcate cu *)
            </div>

            {/* Obiectiv - MANDATORY */}
            <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">1</div>
                    <Target className="h-4 w-4" />
                    Obiectiv *
                </label>
                <input
                    type="text"
                    value={newSubgoal}
                    onChange={(e) => setNewSubgoal(e.target.value)}
                    placeholder="Ex: Creșterea vânzărilor cu 20%"
                    className={cn(
                        "w-full px-3 py-2 rounded-lg border bg-background",
                        newSubgoal.trim() && "border-green-500"
                    )}
                />
            </div>

            {/* Terv (Plan) - MANDATORY */}
            <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <FileText className="h-4 w-4" />
                    Terv *
                </label>
                <input
                    type="text"
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    placeholder="Ex: Plan T1 2026"
                    className={cn(
                        "w-full px-3 py-2 rounded-lg border bg-background",
                        newPlan.trim() && "border-green-500"
                    )}
                    disabled={!newSubgoal.trim()}
                />
            </div>

            {/* Program - MANDATORY */}
            <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                    <Layers className="h-4 w-4" />
                    Program *
                </label>
                <input
                    type="text"
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="Ex: Program de marketing digital"
                    className={cn(
                        "w-full px-3 py-2 rounded-lg border bg-background",
                        newProgram.trim() && "border-green-500"
                    )}
                    disabled={!newPlan.trim()}
                />
            </div>

            {/* Proiect - OPTIONAL */}
            <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/50 to-orange-500/50 flex items-center justify-center text-white text-xs font-bold">4</div>
                    <FolderKanban className="h-4 w-4" />
                    Proiect (opțional)
                    <button
                        className={cn(
                            "ml-auto text-xs px-2 py-0.5 rounded",
                            includeProject ? "bg-amber-500/20 text-amber-500" : "bg-muted text-muted-foreground"
                        )}
                        onClick={() => setIncludeProject(!includeProject)}
                        disabled={!newProgram.trim()}
                    >
                        {includeProject ? "Inclus ✓" : "+ Adaugă"}
                    </button>
                </label>
                {includeProject && (
                    <input
                        type="text"
                        value={newProject}
                        onChange={(e) => setNewProject(e.target.value)}
                        placeholder="Ex: Lansare campanie Facebook"
                        className="w-full px-3 py-2 rounded-lg border bg-background"
                    />
                )}
            </div>

            {/* Completion indicator */}
            {newSubgoal.trim() && newPlan.trim() && newProgram.trim() && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">
                        Ierarhie completă! {includeProject && newProject.trim() ? "(cu Proiect)" : "(până la Program)"}
                    </span>
                </div>
            )}
        </div>
    );
}
