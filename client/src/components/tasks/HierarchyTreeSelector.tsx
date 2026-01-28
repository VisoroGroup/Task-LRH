import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ChevronRight,
    ChevronDown,
    Target,
    FileText,
    Layers,
    FolderKanban,
    ListChecks,
    Plus,
    Check,
    Sparkles,
} from "lucide-react";

interface HierarchyPath {
    subgoalId: string;
    planId: string;
    programId: string;
    projectId: string;
    instructionId: string;
}

interface HierarchyTreeSelectorProps {
    departmentId: string;
    idealScene: any[];
    selectedPath: HierarchyPath;
    onSelectionChange: (path: HierarchyPath) => void;
    onCreateSubgoal: (title: string) => void;
    onCreatePlan: (title: string, subgoalId: string) => void;
    onCreateProgram: (title: string, planId: string) => void;
    onCreateProject: (title: string, programId: string) => void;
    onCreateInstruction: (title: string, projectId: string) => void;
}

// Level configuration with vibrant gradients and icons
const LEVELS = [
    {
        name: "Obiectiv",
        icon: Target,
        gradient: "from-violet-500 to-purple-600",
        bgGradient: "from-violet-500/20 to-purple-600/20",
        border: "border-violet-400",
        ring: "ring-violet-500",
        iconColor: "text-violet-500",
        badge: "bg-violet-500/20 text-violet-400",
    },
    {
        name: "Plan",
        icon: FileText,
        gradient: "from-blue-500 to-cyan-500",
        bgGradient: "from-blue-500/20 to-cyan-500/20",
        border: "border-blue-400",
        ring: "ring-blue-500",
        iconColor: "text-blue-500",
        badge: "bg-blue-500/20 text-blue-400",
    },
    {
        name: "Program",
        icon: Layers,
        gradient: "from-emerald-500 to-teal-500",
        bgGradient: "from-emerald-500/20 to-teal-500/20",
        border: "border-emerald-400",
        ring: "ring-emerald-500",
        iconColor: "text-emerald-500",
        badge: "bg-emerald-500/20 text-emerald-400",
    },
    {
        name: "Proiect",
        icon: FolderKanban,
        gradient: "from-amber-500 to-orange-500",
        bgGradient: "from-amber-500/20 to-orange-500/20",
        border: "border-amber-400",
        ring: "ring-amber-500",
        iconColor: "text-amber-500",
        badge: "bg-amber-500/20 text-amber-400",
    },
    {
        name: "De făcut",
        icon: ListChecks,
        gradient: "from-rose-500 to-pink-500",
        bgGradient: "from-rose-500/20 to-pink-500/20",
        border: "border-rose-400",
        ring: "ring-rose-500",
        iconColor: "text-rose-500",
        badge: "bg-rose-500/20 text-rose-400",
    },
];

const CHILD_LABELS = ["Plan", "Program", "Proiect", "De făcut"];

// Premium Tree Node Component
function TreeNode({
    title,
    level,
    isSelected,
    isExpanded,
    hasChildren,
    onSelect,
    onToggle,
    onAddChild,
    children,
}: {
    title: string;
    level: number;
    isSelected: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    onSelect: () => void;
    onToggle: () => void;
    onAddChild?: () => void;
    children?: React.ReactNode;
}) {
    const config = LEVELS[level];
    const Icon = config.icon;
    const indent = level * 28;

    return (
        <div className="relative">
            {/* Animated connecting line */}
            {level > 0 && (
                <div
                    className="absolute left-[14px] top-0 w-[2px] h-6 bg-gradient-to-b from-border/50 to-border/20"
                    style={{ marginLeft: (level - 1) * 28 }}
                />
            )}
            {level > 0 && (
                <div
                    className="absolute top-6 h-[2px] bg-gradient-to-r from-border/50 to-border/20"
                    style={{
                        left: (level - 1) * 28 + 14,
                        width: 14,
                    }}
                />
            )}

            <div
                className={cn(
                    "relative flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer",
                    "transition-all duration-200 ease-out group",
                    "hover:scale-[1.01] hover:shadow-lg hover:shadow-black/5",
                    isSelected
                        ? `bg-gradient-to-r ${config.bgGradient} ${config.border} border-2 ${config.ring} ring-2 ring-offset-2 ring-offset-background`
                        : "bg-card/50 hover:bg-card border border-border/50 hover:border-border"
                )}
                style={{ marginLeft: indent }}
                onClick={onSelect}
            >
                {/* Expand/Collapse toggle - more visible */}
                <button
                    className={cn(
                        "flex-shrink-0 p-1 rounded-md transition-all",
                        hasChildren
                            ? "hover:bg-white/10 text-foreground"
                            : "text-transparent cursor-default"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) onToggle();
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                        ) : (
                            <ChevronRight className="h-5 w-5" />
                        )
                    ) : (
                        <span className="w-5 h-5" />
                    )}
                </button>

                {/* Icon with gradient background */}
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                    `bg-gradient-to-br ${config.gradient}`,
                    "shadow-lg"
                )}>
                    <Icon className="h-5 w-5 text-white" />
                </div>

                {/* Title and level badge */}
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base truncate">{title}</div>
                    <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-1",
                        config.badge
                    )}>
                        {config.name}
                    </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                    <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        `bg-gradient-to-br ${config.gradient}`,
                        "shadow-lg"
                    )}>
                        <Check className="h-4 w-4 text-white" />
                    </div>
                )}

                {/* Add child button - always visible when applicable */}
                {onAddChild && level < 4 && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "flex-shrink-0 h-9 px-3 text-sm font-medium",
                            "opacity-0 group-hover:opacity-100 transition-opacity",
                            config.iconColor,
                            "hover:bg-white/10"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddChild();
                        }}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        + {CHILD_LABELS[level]}
                    </Button>
                )}
            </div>

            {/* Children with connecting line */}
            {isExpanded && children && (
                <div className="relative mt-2">
                    {/* Vertical connecting line */}
                    <div
                        className="absolute w-[2px] bg-gradient-to-b from-border/40 to-transparent"
                        style={{
                            left: indent + 14,
                            top: 0,
                            height: "calc(100% - 24px)",
                        }}
                    />
                    <div className="space-y-2">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

// Premium Inline Creation Form
function InlineCreateForm({
    level,
    onSubmit,
    onCancel,
}: {
    level: number;
    onSubmit: (title: string) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState("");
    const config = LEVELS[level];
    const indent = level * 28;

    return (
        <div
            className={cn(
                "relative p-4 rounded-xl border-2 mt-2",
                `bg-gradient-to-r ${config.bgGradient}`,
                config.border,
                "shadow-lg shadow-black/5"
            )}
            style={{ marginLeft: indent }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className={cn("h-4 w-4", config.iconColor)} />
                <span className={cn("text-sm font-semibold", config.iconColor)}>
                    Creare {config.name} nou
                </span>
            </div>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cn(
                    "w-full px-4 py-3 rounded-lg text-base font-medium",
                    "bg-background/80 backdrop-blur border-2",
                    config.border,
                    "focus:outline-none focus:ring-2",
                    config.ring,
                    "placeholder:text-muted-foreground/50"
                )}
                placeholder={`Numele ${config.name}...`}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) {
                        onSubmit(title.trim());
                    } else if (e.key === "Escape") {
                        onCancel();
                    }
                }}
            />
            <div className="flex gap-3 mt-3">
                <Button
                    className={cn(
                        "flex-1 h-10",
                        `bg-gradient-to-r ${config.gradient}`,
                        "text-white font-semibold shadow-lg",
                        "hover:opacity-90 transition-opacity"
                    )}
                    onClick={() => title.trim() && onSubmit(title.trim())}
                    disabled={!title.trim()}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Creează
                </Button>
                <Button
                    variant="ghost"
                    className="h-10 px-4"
                    onClick={onCancel}
                >
                    Anulează
                </Button>
            </div>
        </div>
    );
}

export function HierarchyTreeSelector({
    departmentId,
    idealScene,
    selectedPath,
    onSelectionChange,
    onCreateSubgoal,
    onCreatePlan,
    onCreateProgram,
    onCreateProject,
    onCreateInstruction,
}: HierarchyTreeSelectorProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [creatingAt, setCreatingAt] = useState<{
        level: "subgoal" | "plan" | "program" | "project" | "instruction" | null;
        parentId: string;
    }>({ level: null, parentId: "" });

    // Get subgoals for selected department
    const getSubgoals = () => {
        if (!idealScene || idealScene.length === 0 || !departmentId) return [];
        const mainGoal = idealScene[0];
        if (!mainGoal?.subgoals) return [];
        return mainGoal.subgoals.filter((s: any) => s.departmentId === departmentId);
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    // Selection handlers with auto-expand
    const selectSubgoal = (id: string) => {
        onSelectionChange({ subgoalId: id, planId: "", programId: "", projectId: "", instructionId: "" });
        setExpandedIds(new Set([...expandedIds, id]));
    };

    const selectPlan = (subgoalId: string, planId: string) => {
        onSelectionChange({ subgoalId, planId, programId: "", projectId: "", instructionId: "" });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId]));
    };

    const selectProgram = (subgoalId: string, planId: string, programId: string) => {
        onSelectionChange({ subgoalId, planId, programId, projectId: "", instructionId: "" });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId, programId]));
    };

    const selectProject = (subgoalId: string, planId: string, programId: string, projectId: string) => {
        onSelectionChange({ subgoalId, planId, programId, projectId, instructionId: "" });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId, programId, projectId]));
    };

    const selectInstruction = (subgoalId: string, planId: string, programId: string, projectId: string, instructionId: string) => {
        onSelectionChange({ subgoalId, planId, programId, projectId, instructionId });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId, programId, projectId, instructionId]));
    };

    const subgoals = getSubgoals();

    if (!departmentId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <Target className="h-8 w-8 text-violet-500" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">
                    Selectează departamentul pentru a vedea ierarhia
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-600/10 border border-violet-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Ierarhie Admin Scale</div>
                        <div className="text-xs text-muted-foreground">Click pentru a selecta</div>
                    </div>
                </div>
                <Button
                    size="sm"
                    className="h-9 px-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg hover:opacity-90"
                    onClick={() => setCreatingAt({ level: "subgoal", parentId: "" })}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    + Obiectiv nou
                </Button>
            </div>

            {/* Subgoal creation form */}
            {creatingAt.level === "subgoal" && (
                <InlineCreateForm
                    level={0}
                    onSubmit={(title) => {
                        onCreateSubgoal(title);
                        setCreatingAt({ level: null, parentId: "" });
                    }}
                    onCancel={() => setCreatingAt({ level: null, parentId: "" })}
                />
            )}

            {/* Tree */}
            {subgoals.length === 0 && creatingAt.level !== "subgoal" ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8 text-violet-500" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                        Nu există obiective pentru acest departament
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Click pe "Obiectiv nou" pentru a crea unul
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {subgoals.map((subgoal: any) => (
                        <TreeNode
                            key={subgoal.id}

                            title={subgoal.title}
                            level={0}
                            isSelected={selectedPath.subgoalId === subgoal.id && !selectedPath.planId}
                            isExpanded={expandedIds.has(subgoal.id)}
                            hasChildren={(subgoal.plans?.length > 0) || (creatingAt.level === "plan" && creatingAt.parentId === subgoal.id)}
                            onSelect={() => selectSubgoal(subgoal.id)}
                            onToggle={() => toggleExpand(subgoal.id)}
                            onAddChild={() => setCreatingAt({ level: "plan", parentId: subgoal.id })}
                        >
                            {/* Plan creation form */}
                            {creatingAt.level === "plan" && creatingAt.parentId === subgoal.id && (
                                <InlineCreateForm
                                    level={1}
                                    onSubmit={(title) => {
                                        onCreatePlan(title, subgoal.id);
                                        setCreatingAt({ level: null, parentId: "" });
                                    }}
                                    onCancel={() => setCreatingAt({ level: null, parentId: "" })}
                                />
                            )}

                            {/* Plans */}
                            {subgoal.plans?.map((plan: any) => (
                                <TreeNode
                                    key={plan.id}

                                    title={plan.title}
                                    level={1}
                                    isSelected={selectedPath.planId === plan.id && !selectedPath.programId}
                                    isExpanded={expandedIds.has(plan.id)}
                                    hasChildren={(plan.programs?.length > 0) || (creatingAt.level === "program" && creatingAt.parentId === plan.id)}
                                    onSelect={() => selectPlan(subgoal.id, plan.id)}
                                    onToggle={() => toggleExpand(plan.id)}
                                    onAddChild={() => setCreatingAt({ level: "program", parentId: plan.id })}
                                >
                                    {/* Program creation form */}
                                    {creatingAt.level === "program" && creatingAt.parentId === plan.id && (
                                        <InlineCreateForm
                                            level={2}
                                            onSubmit={(title) => {
                                                onCreateProgram(title, plan.id);
                                                setCreatingAt({ level: null, parentId: "" });
                                            }}
                                            onCancel={() => setCreatingAt({ level: null, parentId: "" })}
                                        />
                                    )}

                                    {/* Programs */}
                                    {plan.programs?.map((program: any) => (
                                        <TreeNode
                                            key={program.id}

                                            title={program.title}
                                            level={2}
                                            isSelected={selectedPath.programId === program.id && !selectedPath.projectId}
                                            isExpanded={expandedIds.has(program.id)}
                                            hasChildren={(program.projects?.length > 0) || (creatingAt.level === "project" && creatingAt.parentId === program.id)}
                                            onSelect={() => selectProgram(subgoal.id, plan.id, program.id)}
                                            onToggle={() => toggleExpand(program.id)}
                                            onAddChild={() => setCreatingAt({ level: "project", parentId: program.id })}
                                        >
                                            {/* Project creation form */}
                                            {creatingAt.level === "project" && creatingAt.parentId === program.id && (
                                                <InlineCreateForm
                                                    level={3}
                                                    onSubmit={(title) => {
                                                        onCreateProject(title, program.id);
                                                        setCreatingAt({ level: null, parentId: "" });
                                                    }}
                                                    onCancel={() => setCreatingAt({ level: null, parentId: "" })}
                                                />
                                            )}

                                            {/* Projects */}
                                            {program.projects?.map((project: any) => (
                                                <TreeNode
                                                    key={project.id}

                                                    title={project.title}
                                                    level={3}
                                                    isSelected={selectedPath.projectId === project.id && !selectedPath.instructionId}
                                                    isExpanded={expandedIds.has(project.id)}
                                                    hasChildren={(project.instructions?.length > 0) || (creatingAt.level === "instruction" && creatingAt.parentId === project.id)}
                                                    onSelect={() => selectProject(subgoal.id, plan.id, program.id, project.id)}
                                                    onToggle={() => toggleExpand(project.id)}
                                                    onAddChild={() => setCreatingAt({ level: "instruction", parentId: project.id })}
                                                >
                                                    {/* Instruction creation form */}
                                                    {creatingAt.level === "instruction" && creatingAt.parentId === project.id && (
                                                        <InlineCreateForm
                                                            level={4}
                                                            onSubmit={(title) => {
                                                                onCreateInstruction(title, project.id);
                                                                setCreatingAt({ level: null, parentId: "" });
                                                            }}
                                                            onCancel={() => setCreatingAt({ level: null, parentId: "" })}
                                                        />
                                                    )}

                                                    {/* Instructions */}
                                                    {project.instructions?.map((instruction: any) => (
                                                        <TreeNode
                                                            key={instruction.id}

                                                            title={instruction.title}
                                                            level={4}
                                                            isSelected={selectedPath.instructionId === instruction.id}
                                                            isExpanded={false}
                                                            hasChildren={false}
                                                            onSelect={() => selectInstruction(subgoal.id, plan.id, program.id, project.id, instruction.id)}
                                                            onToggle={() => { }}
                                                        />
                                                    ))}
                                                </TreeNode>
                                            ))}
                                        </TreeNode>
                                    ))}
                                </TreeNode>
                            ))}
                        </TreeNode>
                    ))}
                </div>
            )}

            {/* Selection summary with full path */}
            {selectedPath.subgoalId && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Nivel selectat</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {(() => {
                            const levelConfig = selectedPath.instructionId ? LEVELS[4] :
                                selectedPath.projectId ? LEVELS[3] :
                                    selectedPath.programId ? LEVELS[2] :
                                        selectedPath.planId ? LEVELS[1] : LEVELS[0];
                            return (
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold",
                                    `bg-gradient-to-r ${levelConfig.gradient}`,
                                    "text-white shadow-lg"
                                )}>
                                    {React.createElement(levelConfig.icon, { className: "h-4 w-4" })}
                                    {levelConfig.name}
                                </span>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
