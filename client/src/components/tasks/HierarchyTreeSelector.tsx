import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ChevronRight,
    ChevronDown,
    Flag,
    FileText,
    Layers,
    FolderKanban,
    Plus,
    Check,
} from "lucide-react";

interface HierarchyPath {
    subgoalId: string;
    planId: string;
    programId: string;
    projectId: string;
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
}

// Tree node component with visual connecting lines
function TreeNode({
    id,
    title,
    level,
    levelName,
    icon,
    isSelected,
    isExpanded,
    hasChildren,
    onSelect,
    onToggle,
    onAddChild,
    addChildLabel,
    children,
}: {
    id: string;
    title: string;
    level: number;
    levelName: string;
    icon: React.ReactNode;
    isSelected: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    onSelect: () => void;
    onToggle: () => void;
    onAddChild?: () => void;
    addChildLabel?: string;
    children?: React.ReactNode;
}) {
    const levelColors = [
        "border-indigo-500 bg-indigo-500/10", // Subgoal
        "border-blue-500 bg-blue-500/10",     // Plan  
        "border-green-500 bg-green-500/10",   // Program
        "border-yellow-500 bg-yellow-500/10", // Project
    ];

    return (
        <div className="relative">
            {/* Vertical line from parent */}
            {level > 0 && (
                <div
                    className="absolute left-3 top-0 w-px bg-border h-4"
                    style={{ marginLeft: (level - 1) * 24 }}
                />
            )}

            {/* Horizontal line to node */}
            {level > 0 && (
                <div
                    className="absolute top-4 h-px bg-border"
                    style={{
                        left: (level - 1) * 24 + 12,
                        width: 12,
                    }}
                />
            )}

            <div
                className={cn(
                    "flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all group",
                    "hover:bg-accent/50",
                    isSelected && levelColors[level] || "",
                    isSelected && "ring-2 ring-offset-1"
                )}
                style={{ marginLeft: level * 24 }}
                onClick={onSelect}
            >
                {/* Expand/Collapse toggle */}
                <button
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )
                    ) : (
                        <span className="w-4" />
                    )}
                </button>

                {/* Icon */}
                <span className="flex-shrink-0">{icon}</span>

                {/* Title */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{title}</div>
                    <div className="text-xs text-muted-foreground">{levelName}</div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}

                {/* Add child button */}
                {onAddChild && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 px-2 text-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddChild();
                        }}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        {addChildLabel}
                    </Button>
                )}
            </div>

            {/* Children with connecting line */}
            {isExpanded && children && (
                <div className="relative">
                    {/* Vertical line for children */}
                    <div
                        className="absolute w-px bg-border"
                        style={{
                            left: level * 24 + 12,
                            top: 0,
                            height: "calc(100% - 16px)",
                        }}
                    />
                    {children}
                </div>
            )}
        </div>
    );
}

// Inline creation form
function InlineCreateForm({
    level,
    levelName,
    onSubmit,
    onCancel,
}: {
    level: number;
    levelName: string;
    onSubmit: (title: string) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState("");

    const levelColors = [
        "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200",
        "bg-blue-50 dark:bg-blue-900/20 border-blue-200",
        "bg-green-50 dark:bg-green-900/20 border-green-200",
        "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200",
    ];

    return (
        <div
            className={cn(
                "p-3 rounded-lg border mt-1",
                levelColors[level]
            )}
            style={{ marginLeft: level * 24 }}
        >
            <div className="text-xs font-medium text-muted-foreground mb-2">
                Új {levelName}
            </div>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2 py-1.5 border rounded text-sm bg-background"
                placeholder={`${levelName} neve...`}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) {
                        onSubmit(title.trim());
                    } else if (e.key === "Escape") {
                        onCancel();
                    }
                }}
            />
            <div className="flex gap-2 mt-2">
                <Button
                    size="sm"
                    onClick={() => title.trim() && onSubmit(title.trim())}
                    disabled={!title.trim()}
                >
                    Létrehozás
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                    Mégse
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
}: HierarchyTreeSelectorProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [creatingAt, setCreatingAt] = useState<{
        level: "subgoal" | "plan" | "program" | "project" | null;
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

    // Auto-expand when selecting
    const selectSubgoal = (id: string) => {
        onSelectionChange({ subgoalId: id, planId: "", programId: "", projectId: "" });
        setExpandedIds(new Set([...expandedIds, id]));
    };

    const selectPlan = (subgoalId: string, planId: string) => {
        onSelectionChange({ subgoalId, planId, programId: "", projectId: "" });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId]));
    };

    const selectProgram = (subgoalId: string, planId: string, programId: string) => {
        onSelectionChange({ subgoalId, planId, programId, projectId: "" });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId, programId]));
    };

    const selectProject = (subgoalId: string, planId: string, programId: string, projectId: string) => {
        onSelectionChange({ subgoalId, planId, programId, projectId });
        setExpandedIds(new Set([...expandedIds, subgoalId, planId, programId, projectId]));
    };

    const subgoals = getSubgoals();

    if (!departmentId) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                Válassz osztályt a hierarchia megtekintéséhez
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* Header with Add Subgoal button */}
            <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium text-muted-foreground">
                    Hierarchia - Kattints a kiválasztáshoz
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setCreatingAt({ level: "subgoal", parentId: "" })}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Új Alcél
                </Button>
            </div>

            {/* Subgoal creation form */}
            {creatingAt.level === "subgoal" && (
                <InlineCreateForm
                    level={0}
                    levelName="Alcél"
                    onSubmit={(title) => {
                        onCreateSubgoal(title);
                        setCreatingAt({ level: null, parentId: "" });
                    }}
                    onCancel={() => setCreatingAt({ level: null, parentId: "" })}
                />
            )}

            {/* Tree */}
            {subgoals.length === 0 && creatingAt.level !== "subgoal" ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                    Nincs alcél ehhez az osztályhoz. Kattints az "Új Alcél" gombra!
                </div>
            ) : (
                subgoals.map((subgoal: any) => (
                    <TreeNode
                        key={subgoal.id}
                        id={subgoal.id}
                        title={subgoal.title}
                        level={0}
                        levelName="Alcél"
                        icon={<Flag className="h-4 w-4 text-indigo-500" />}
                        isSelected={selectedPath.subgoalId === subgoal.id && !selectedPath.planId}
                        isExpanded={expandedIds.has(subgoal.id)}
                        hasChildren={(subgoal.plans?.length > 0) || creatingAt.level === "plan" && creatingAt.parentId === subgoal.id}
                        onSelect={() => selectSubgoal(subgoal.id)}
                        onToggle={() => toggleExpand(subgoal.id)}
                        onAddChild={() => setCreatingAt({ level: "plan", parentId: subgoal.id })}
                        addChildLabel="Terv"
                    >
                        {/* Plan creation form */}
                        {creatingAt.level === "plan" && creatingAt.parentId === subgoal.id && (
                            <InlineCreateForm
                                level={1}
                                levelName="Terv"
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
                                id={plan.id}
                                title={plan.title}
                                level={1}
                                levelName="Terv"
                                icon={<FileText className="h-4 w-4 text-blue-500" />}
                                isSelected={selectedPath.planId === plan.id && !selectedPath.programId}
                                isExpanded={expandedIds.has(plan.id)}
                                hasChildren={(plan.programs?.length > 0) || creatingAt.level === "program" && creatingAt.parentId === plan.id}
                                onSelect={() => selectPlan(subgoal.id, plan.id)}
                                onToggle={() => toggleExpand(plan.id)}
                                onAddChild={() => setCreatingAt({ level: "program", parentId: plan.id })}
                                addChildLabel="Program"
                            >
                                {/* Program creation form */}
                                {creatingAt.level === "program" && creatingAt.parentId === plan.id && (
                                    <InlineCreateForm
                                        level={2}
                                        levelName="Program"
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
                                        id={program.id}
                                        title={program.title}
                                        level={2}
                                        levelName="Program"
                                        icon={<Layers className="h-4 w-4 text-green-500" />}
                                        isSelected={selectedPath.programId === program.id && !selectedPath.projectId}
                                        isExpanded={expandedIds.has(program.id)}
                                        hasChildren={(program.projects?.length > 0) || creatingAt.level === "project" && creatingAt.parentId === program.id}
                                        onSelect={() => selectProgram(subgoal.id, plan.id, program.id)}
                                        onToggle={() => toggleExpand(program.id)}
                                        onAddChild={() => setCreatingAt({ level: "project", parentId: program.id })}
                                        addChildLabel="Projekt"
                                    >
                                        {/* Project creation form */}
                                        {creatingAt.level === "project" && creatingAt.parentId === program.id && (
                                            <InlineCreateForm
                                                level={3}
                                                levelName="Projekt"
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
                                                id={project.id}
                                                title={project.title}
                                                level={3}
                                                levelName="Projekt"
                                                icon={<FolderKanban className="h-4 w-4 text-yellow-500" />}
                                                isSelected={selectedPath.projectId === project.id}
                                                isExpanded={false}
                                                hasChildren={false}
                                                onSelect={() => selectProject(subgoal.id, plan.id, program.id, project.id)}
                                                onToggle={() => { }}
                                            />
                                        ))}
                                    </TreeNode>
                                ))}
                            </TreeNode>
                        ))}
                    </TreeNode>
                ))
            )}

            {/* Selection summary */}
            {selectedPath.subgoalId && (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="text-sm font-medium">Kiválasztott szint:</div>
                    <div className="text-sm text-muted-foreground mt-1">
                        {selectedPath.projectId ? "PROJEKT" :
                            selectedPath.programId ? "PROGRAM" :
                                selectedPath.planId ? "PLAN" :
                                    "SUBGOAL"}
                    </div>
                </div>
            )}
        </div>
    );
}
