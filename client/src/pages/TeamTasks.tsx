import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, cn } from "@/lib/utils";
import {
    Target,
    FileText,
    Layers,
    FolderKanban,
    ListChecks,
    Users,
    ChevronDown,
    ChevronRight,
    Plus,
    X,
    Edit2,
    Trash2,
    CheckCircle2,
    Circle,
    Loader2,
} from "lucide-react";

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
}

interface MainGoal {
    id: string;
    title: string;
    description: string | null;
    subgoals: Subgoal[];
}

interface Subgoal {
    id: string;
    title: string;
    departmentId: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    completedAt?: string | null;
    plans?: Plan[];
}

interface Plan {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    completedAt?: string | null;
    programs?: Program[];
}

interface Program {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    completedAt?: string | null;
    projects?: Project[];
}

interface Project {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    completedAt?: string | null;
    instructions?: Instruction[];
}

interface Instruction {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    completedAt?: string | null;
}

interface Department {
    id: string;
    name: string;
}

// Hierarchy level styling
const LEVEL_CONFIG = {
    mainGoal: {
        icon: Target,
        color: "text-white",
        bg: "bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600",
        border: "border-violet-500/50",
        label: "Misiune"
    },
    subgoal: {
        icon: Target,
        color: "text-violet-400",
        bg: "bg-violet-500/10 hover:bg-violet-500/20",
        border: "border-violet-500/30 hover:border-violet-500/50",
        label: "Obiectiv"
    },
    plan: {
        icon: FileText,
        color: "text-blue-400",
        bg: "bg-blue-500/10 hover:bg-blue-500/20",
        border: "border-blue-500/30 hover:border-blue-500/50",
        label: "Plan"
    },
    program: {
        icon: Layers,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
        border: "border-emerald-500/30 hover:border-emerald-500/50",
        label: "Program"
    },
    project: {
        icon: FolderKanban,
        color: "text-amber-400",
        bg: "bg-amber-500/10 hover:bg-amber-500/20",
        border: "border-amber-500/30 hover:border-amber-500/50",
        label: "Proiect"
    },
    instruction: {
        icon: ListChecks,
        color: "text-rose-400",
        bg: "bg-rose-500/10 hover:bg-rose-500/20",
        border: "border-rose-500/30 hover:border-rose-500/50",
        label: "De făcut"
    },
};

// Vertical hierarchy node with connecting lines
function VerticalNode({
    title,
    level,
    children,
    assignedUser,
    itemId,
    itemType,
    users,
    onOwnerChange,
    onAddChild,
    childLevel,
    onEdit,
    onDelete,
    completedAt,
    onComplete,
    isLoading,
}: {
    title: string;
    level: "mainGoal" | "subgoal" | "plan" | "program" | "project" | "instruction";
    children?: React.ReactNode;
    assignedUser?: { id: string; name: string } | null;
    itemId?: string;
    itemType?: string;
    users?: TeamMember[];
    onOwnerChange?: (itemType: string, itemId: string, userId: string | null) => void;
    onAddChild?: (title: string, dueDate: string) => void;
    childLevel?: "subgoal" | "plan" | "program" | "project" | "instruction";
    onEdit?: (newTitle: string) => void;
    onDelete?: () => void;
    completedAt?: string | null;
    onComplete?: () => void;
    isLoading?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(level === "mainGoal");
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [newItemDueDate, setNewItemDueDate] = useState("");

    const config = LEVEL_CONFIG[level];
    const Icon = config.icon;
    const hasChildren = children && React.Children.count(children) > 0;

    const handleAdd = () => {
        if (newItemTitle.trim() && newItemDueDate && onAddChild) {
            onAddChild(newItemTitle.trim(), newItemDueDate);
            setNewItemTitle("");
            setNewItemDueDate("");
            setIsAdding(false);
        }
    };

    const childLabels: Record<string, string> = {
        subgoal: "Obiectiv",
        plan: "Plan",
        program: "Program",
        project: "Proiect",
        instruction: "De făcut",
    };

    return (
        <div className="relative">
            {/* Vertical connecting line from parent */}
            {level !== "mainGoal" && (
                <div
                    className="absolute left-6 -top-3 w-0.5 h-3 bg-gradient-to-b from-border/50 to-transparent"
                />
            )}

            {/* Node card */}
            <div
                className={cn(
                    "relative group rounded-xl border-2 transition-all duration-300",
                    level === "mainGoal"
                        ? "p-6 shadow-2xl shadow-purple-500/20"
                        : "p-4",
                    config.bg,
                    config.border,
                    "cursor-pointer"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-4">
                    {/* Expand/collapse button */}
                    <button className="flex-shrink-0 mt-1">
                        {hasChildren || onAddChild ? (
                            isExpanded
                                ? <ChevronDown className={cn("h-5 w-5", level === "mainGoal" ? "text-white/70" : "text-muted-foreground")} />
                                : <ChevronRight className={cn("h-5 w-5", level === "mainGoal" ? "text-white/70" : "text-muted-foreground")} />
                        ) : (
                            <span className="w-5" />
                        )}
                    </button>

                    {/* Icon */}
                    <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                        level === "mainGoal" ? "bg-white/20" : "bg-background/50"
                    )}>
                        <Icon className={cn("h-6 w-6", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {isEditing && onEdit ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { onEdit(editTitle); setIsEditing(false); }
                                        else if (e.key === "Escape") { setEditTitle(title); setIsEditing(false); }
                                    }}
                                    className="flex-1 bg-background border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    autoFocus
                                />
                                <Button size="sm" onClick={() => { onEdit(editTitle); setIsEditing(false); }}>
                                    ✓
                                </Button>
                            </div>
                        ) : (
                            <h3 className={cn(
                                "font-bold",
                                level === "mainGoal" ? "text-xl text-white" : "text-lg"
                            )}>
                                {title}
                            </h3>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "text-sm font-medium",
                                level === "mainGoal" ? "text-white/60" : "text-muted-foreground"
                            )}>
                                {config.label}
                            </span>

                            {level !== "mainGoal" && assignedUser && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs">
                                            {assignedUser.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-primary">{assignedUser.name}</span>
                                    </div>
                                </>
                            )}

                            {level !== "mainGoal" && !assignedUser && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-sm text-yellow-500">Fără responsabil</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Actions - visible on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {/* Owner selector */}
                        {level !== "mainGoal" && itemId && itemType && users && onOwnerChange && (
                            <select
                                value={assignedUser?.id || ""}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onOwnerChange(itemType, itemId, e.target.value || null)}
                                className="px-2 py-1 rounded-lg text-xs font-medium border bg-background"
                            >
                                <option value="">— Responsabil —</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        )}

                        {/* Add child */}
                        {onAddChild && childLevel && (
                            <button
                                className="p-1.5 rounded-lg hover:bg-white/10"
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); setIsAdding(true); }}
                                title={`Adaugă ${childLabels[childLevel]}`}
                            >
                                <Plus className="h-4 w-4 text-primary" />
                            </button>
                        )}

                        {/* Edit */}
                        {level !== "mainGoal" && onEdit && !isEditing && (
                            <button
                                className="p-1.5 rounded-lg hover:bg-white/10"
                                onClick={(e) => { e.stopPropagation(); setEditTitle(title); setIsEditing(true); }}
                                title="Editează"
                            >
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                        )}

                        {/* Delete */}
                        {level !== "mainGoal" && onDelete && (
                            <button
                                className="p-1.5 rounded-lg hover:bg-red-500/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Sigur doriți să ștergeți?")) onDelete();
                                }}
                                title="Șterge"
                            >
                                <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                        )}

                        {/* Complete checkbox */}
                        {level !== "mainGoal" && onComplete && (
                            <button
                                className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    completedAt
                                        ? "bg-green-500/20 hover:bg-green-500/30"
                                        : "hover:bg-green-500/10"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!completedAt && !isLoading) onComplete();
                                }}
                                title={completedAt ? "Finalizat" : isLoading ? "Feldolgozás..." : "Marchează ca finalizat"}
                                disabled={!!completedAt || isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 text-green-500 animate-spin" />
                                ) : completedAt ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground hover:text-green-500" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Children container with vertical line */}
            {isExpanded && (hasChildren || isAdding) && (
                <div className="relative mt-3 ml-6 pl-6 border-l-2 border-dashed border-border/40">
                    {/* Add new item form */}
                    {isAdding && onAddChild && childLevel && (
                        <div
                            className="mb-3 p-4 bg-card rounded-xl border-2 border-primary/30 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="text"
                                    placeholder={`Nume ${childLabels[childLevel].toLowerCase()}...`}
                                    value={newItemTitle}
                                    onChange={(e) => setNewItemTitle(e.target.value)}
                                    className="flex-1 min-w-[200px] bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    autoFocus
                                />
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-muted-foreground">Termen:</label>
                                    <input
                                        type="date"
                                        value={newItemDueDate}
                                        onChange={(e) => setNewItemDueDate(e.target.value)}
                                        className="bg-background border rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <Button size="sm" onClick={handleAdd} disabled={!newItemTitle.trim() || !newItemDueDate}>
                                    Adaugă
                                </Button>
                                <button
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                    onClick={() => { setIsAdding(false); setNewItemTitle(""); setNewItemDueDate(""); }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Children */}
                    <div className="space-y-3">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

export function TeamTasks() {
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch data
    const { data: users = [] } = useQuery<TeamMember[]>({
        queryKey: ["users"],
        queryFn: () => apiRequest("/api/users"),
    });

    const { data: idealScene = [], isLoading } = useQuery<MainGoal[]>({
        queryKey: ["ideal-scene"],
        queryFn: () => apiRequest("/api/ideal-scene"),
    });

    const { data: departments = [] } = useQuery<Department[]>({
        queryKey: ["departments"],
        queryFn: () => apiRequest("/api/departments"),
    });

    // Mutations
    const updateOwnerMutation = useMutation({
        mutationFn: async ({ type, id, userId }: { type: string; id: string; userId: string | null }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}/owner`, {
                method: "PUT",
                body: JSON.stringify({ assignedPostId: userId }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const createSubgoalMutation = useMutation({
        mutationFn: async ({ mainGoalId, title, departmentId, dueDate }: { mainGoalId: string; title: string; departmentId: string; dueDate: string }) => {
            return apiRequest("/api/ideal-scene/subgoals", {
                method: "POST",
                body: JSON.stringify({ mainGoalId, title, departmentId, dueDate }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const createPlanMutation = useMutation({
        mutationFn: async ({ subgoalId, title, dueDate, departmentId }: { subgoalId: string; title: string; dueDate: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/plans", {
                method: "POST",
                body: JSON.stringify({ subgoalId, title, dueDate, departmentId }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const createProgramMutation = useMutation({
        mutationFn: async ({ planId, title, dueDate }: { planId: string; title: string; dueDate: string }) => {
            return apiRequest("/api/ideal-scene/programs", {
                method: "POST",
                body: JSON.stringify({ planId, title, dueDate }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const createProjectMutation = useMutation({
        mutationFn: async ({ programId, title, dueDate }: { programId: string; title: string; dueDate: string }) => {
            return apiRequest("/api/ideal-scene/projects", {
                method: "POST",
                body: JSON.stringify({ programId, title, dueDate }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const createInstructionMutation = useMutation({
        mutationFn: async ({ projectId, title, dueDate }: { projectId: string; title: string; dueDate: string }) => {
            return apiRequest("/api/ideal-scene/instructions", {
                method: "POST",
                body: JSON.stringify({ projectId, title, dueDate }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const updateHierarchyMutation = useMutation({
        mutationFn: async ({ type, id, title }: { type: string; id: string; title: string }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}`, {
                method: "PUT",
                body: JSON.stringify({ title }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const deleteHierarchyMutation = useMutation({
        mutationFn: async ({ type, id }: { type: string; id: string }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}`, { method: "DELETE" });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    const { user } = useAuth();
    const { toast } = useToast();

    const completeHierarchyMutation = useMutation({
        mutationFn: async ({ type, id }: { type: string; id: string }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}/complete`, {
                method: "POST",
                body: JSON.stringify({ userId: user?.id }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            toast({
                title: "✅ Finalizat!",
                description: "Elementul a fost marcat ca finalizat.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Eroare",
                description: error.message || "Nu s-a putut finaliza elementul.",
                variant: "destructive",
            });
        },
    });

    const handleOwnerChange = (itemType: string, itemId: string, userId: string | null) => {
        updateOwnerMutation.mutate({ type: itemType, id: itemId, userId });
    };

    // Filter hierarchy based on selected member
    const filterByMember = (user: { id: string; name: string } | null | undefined) => {
        if (!selectedMember) return true;
        return user?.id === selectedMember;
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64 text-muted-foreground">Se încarcă...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">
                        Sarcinile echipei
                    </h1>
                    <p className="text-lg text-muted-foreground mt-1">
                        Structura organizațională în format vizual
                    </p>
                </div>

                <select
                    value={selectedDepartment || ""}
                    onChange={(e) => setSelectedDepartment(e.target.value || null)}
                    className="px-4 py-2 rounded-xl bg-background border text-sm font-medium"
                >
                    <option value="">Toate departamentele</option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
            </div>

            {/* Team member filter */}
            <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-card/30 backdrop-blur border">
                <button
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                        selectedMember === null
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg"
                            : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                    )}
                    onClick={() => setSelectedMember(null)}
                >
                    <Users className="h-4 w-4" />
                    <span>Toți</span>
                </button>

                {users.map(user => (
                    <button
                        key={user.id}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                            selectedMember === user.id
                                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg"
                                : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                        )}
                        onClick={() => setSelectedMember(user.id)}
                    >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs overflow-hidden">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <span>{user.name}</span>
                    </button>
                ))}
            </div>

            {/* Vertical hierarchy tree */}
            <Card className="border-2 overflow-hidden">
                <CardContent className="p-8">
                    {idealScene.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Target className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p className="text-xl font-medium">Nu există obiective definite</p>
                            <p className="text-sm mt-2">Adaugă un obiectiv principal din pagina "Imaginea ideală"</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {idealScene.map((mainGoal) => (
                                <VerticalNode
                                    key={mainGoal.id}
                                    title={mainGoal.description || "Misiune"}
                                    level="mainGoal"
                                    onAddChild={(title, dueDate) => {
                                        const firstDept = departments[0];
                                        if (firstDept) {
                                            createSubgoalMutation.mutate({ mainGoalId: mainGoal.id, title, departmentId: firstDept.id, dueDate });
                                        }
                                    }}
                                    childLevel="subgoal"
                                >
                                    {mainGoal.subgoals
                                        ?.filter(s => !selectedDepartment || s.departmentId === selectedDepartment)
                                        .filter(s => filterByMember(s.assignedUser))
                                        .map((subgoal) => (
                                            <VerticalNode
                                                key={subgoal.id}
                                                title={subgoal.title}
                                                level="subgoal"
                                                assignedUser={subgoal.assignedUser}
                                                itemId={subgoal.id}
                                                itemType="subgoals"
                                                users={users}
                                                onOwnerChange={handleOwnerChange}
                                                onAddChild={(title, dueDate) => createPlanMutation.mutate({ subgoalId: subgoal.id, title, dueDate, departmentId: subgoal.departmentId })}
                                                childLevel="plan"
                                                onEdit={(t) => updateHierarchyMutation.mutate({ type: "subgoals", id: subgoal.id, title: t })}
                                                onDelete={() => deleteHierarchyMutation.mutate({ type: "subgoals", id: subgoal.id })}
                                                completedAt={subgoal.completedAt}
                                                onComplete={() => completeHierarchyMutation.mutate({ type: "subgoals", id: subgoal.id })}
                                                isLoading={completeHierarchyMutation.isPending}
                                            >
                                                {subgoal.plans?.filter(p => filterByMember(p.assignedUser)).map((plan) => (
                                                    <VerticalNode
                                                        key={plan.id}
                                                        title={plan.title}
                                                        level="plan"
                                                        assignedUser={plan.assignedUser}
                                                        itemId={plan.id}
                                                        itemType="plans"
                                                        users={users}
                                                        onOwnerChange={handleOwnerChange}
                                                        onAddChild={(title, dueDate) => createProgramMutation.mutate({ planId: plan.id, title, dueDate })}
                                                        childLevel="program"
                                                        onEdit={(t) => updateHierarchyMutation.mutate({ type: "plans", id: plan.id, title: t })}
                                                        onDelete={() => deleteHierarchyMutation.mutate({ type: "plans", id: plan.id })}
                                                        completedAt={plan.completedAt}
                                                        onComplete={() => completeHierarchyMutation.mutate({ type: "plans", id: plan.id })}
                                                        isLoading={completeHierarchyMutation.isPending}
                                                    >
                                                        {plan.programs?.filter(pr => filterByMember(pr.assignedUser)).map((program) => (
                                                            <VerticalNode
                                                                key={program.id}
                                                                title={program.title}
                                                                level="program"
                                                                assignedUser={program.assignedUser}
                                                                itemId={program.id}
                                                                itemType="programs"
                                                                users={users}
                                                                onOwnerChange={handleOwnerChange}
                                                                onAddChild={(title, dueDate) => createProjectMutation.mutate({ programId: program.id, title, dueDate })}
                                                                childLevel="project"
                                                                onEdit={(t) => updateHierarchyMutation.mutate({ type: "programs", id: program.id, title: t })}
                                                                onDelete={() => deleteHierarchyMutation.mutate({ type: "programs", id: program.id })}
                                                                completedAt={program.completedAt}
                                                                onComplete={() => completeHierarchyMutation.mutate({ type: "programs", id: program.id })}
                                                                isLoading={completeHierarchyMutation.isPending}
                                                            >
                                                                {program.projects?.filter(pj => filterByMember(pj.assignedUser)).map((project) => (
                                                                    <VerticalNode
                                                                        key={project.id}
                                                                        title={project.title}
                                                                        level="project"
                                                                        assignedUser={project.assignedUser}
                                                                        itemId={project.id}
                                                                        itemType="projects"
                                                                        users={users}
                                                                        onOwnerChange={handleOwnerChange}
                                                                        onAddChild={(title, dueDate) => createInstructionMutation.mutate({ projectId: project.id, title, dueDate })}
                                                                        childLevel="instruction"
                                                                        onEdit={(t) => updateHierarchyMutation.mutate({ type: "projects", id: project.id, title: t })}
                                                                        onDelete={() => deleteHierarchyMutation.mutate({ type: "projects", id: project.id })}
                                                                        completedAt={project.completedAt}
                                                                        onComplete={() => completeHierarchyMutation.mutate({ type: "projects", id: project.id })}
                                                                        isLoading={completeHierarchyMutation.isPending}
                                                                    >
                                                                        {project.instructions?.filter(i => filterByMember(i.assignedUser)).map((instruction) => (
                                                                            <VerticalNode
                                                                                key={instruction.id}
                                                                                title={instruction.title}
                                                                                level="instruction"
                                                                                assignedUser={instruction.assignedUser}
                                                                                itemId={instruction.id}
                                                                                itemType="instructions"
                                                                                users={users}
                                                                                onOwnerChange={handleOwnerChange}
                                                                                onEdit={(t) => updateHierarchyMutation.mutate({ type: "instructions", id: instruction.id, title: t })}
                                                                                onDelete={() => deleteHierarchyMutation.mutate({ type: "instructions", id: instruction.id })}
                                                                                completedAt={instruction.completedAt}
                                                                                onComplete={() => completeHierarchyMutation.mutate({ type: "instructions", id: instruction.id })}
                                                                                isLoading={completeHierarchyMutation.isPending}
                                                                            />
                                                                        ))}
                                                                    </VerticalNode>
                                                                ))}
                                                            </VerticalNode>
                                                        ))}
                                                    </VerticalNode>
                                                ))}
                                            </VerticalNode>
                                        ))}
                                </VerticalNode>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
