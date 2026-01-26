import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, cn, formatDate, statusLabels } from "@/lib/utils";
import {
    Target,
    FileText,
    Layers,
    FolderKanban,
    ListChecks,
    User,
    Users,
    Building2,
    Clock,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    Plus,
    X,
    Edit2,
    Trash2,
} from "lucide-react";

interface Task {
    id: string;
    title: string;
    status: "TODO" | "DOING" | "DONE";
    hierarchyLevel: string;
    parentItemId: string;
    dueDate: string | null;
    department: { id: string; name: string };
    responsiblePost?: { id: string; name: string; user: { id: string; name: string } | null };
    mainGoalTitle?: string | null;
    hierarchyPath?: string[];
}

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
    plans?: Plan[];
}

interface Plan {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    programs?: Program[];
}

interface Program {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    projects?: Project[];
}

interface Project {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
    instructions?: Instruction[];
}

interface Instruction {
    id: string;
    title: string;
    assignedPostId?: string | null;
    assignedUser?: { id: string; name: string };
}

interface Department {
    id: string;
    name: string;
}

// Hierarchy level icons and colors
const LEVEL_CONFIG = {
    mainGoal: { icon: Target, color: "text-violet-500", bg: "bg-violet-500/20", gradient: "from-violet-500 to-purple-600" },
    subgoal: { icon: Target, color: "text-violet-500", bg: "bg-violet-500/20", gradient: "from-violet-500 to-purple-600" },
    plan: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/20", gradient: "from-blue-500 to-cyan-500" },
    program: { icon: Layers, color: "text-emerald-500", bg: "bg-emerald-500/20", gradient: "from-emerald-500 to-teal-500" },
    project: { icon: FolderKanban, color: "text-amber-500", bg: "bg-amber-500/20", gradient: "from-amber-500 to-orange-500" },
    instruction: { icon: ListChecks, color: "text-rose-500", bg: "bg-rose-500/20", gradient: "from-rose-500 to-pink-500" },
};

// Task card component
function TaskCard({ task }: { task: Task }) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

    const statusColors = {
        TODO: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        DOING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        DONE: "bg-green-500/20 text-green-400 border-green-500/30",
    };

    return (
        <div className={cn(
            "p-3 rounded-lg border ml-6 mt-2",
            "bg-card/50 hover:bg-card transition-colors",
            isOverdue && "border-red-500/50"
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium border",
                            statusColors[task.status]
                        )}>
                            {statusLabels[task.status]}
                        </span>
                        {isOverdue && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                Întârziat
                            </span>
                        )}
                    </div>
                    <h4 className="font-medium text-sm truncate">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {task.responsiblePost && (
                            <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.responsiblePost.name}
                            </span>
                        )}
                        {task.dueDate && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(task.dueDate)}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {task.department?.name}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Hierarchy node component
function HierarchyNode({
    title,
    level,
    children,
    tasks,
    defaultExpanded = false,
    assignedUser,
    itemId,
    itemType,
    users,
    onOwnerChange,
    onAddChild,
    childLevel,
    onEdit,
    onDelete,
}: {
    title: string;
    level: "mainGoal" | "subgoal" | "plan" | "program" | "project" | "instruction";
    children?: React.ReactNode;
    tasks?: Task[];
    defaultExpanded?: boolean;
    assignedUser?: { id: string; name: string } | null;
    itemId?: string;
    itemType?: string;
    users?: TeamMember[];
    onOwnerChange?: (itemType: string, itemId: string, userId: string | null) => void;
    onAddChild?: (title: string, dueDate: string) => void;
    childLevel?: "subgoal" | "plan" | "program" | "project" | "instruction";
    onEdit?: (newTitle: string) => void;
    onDelete?: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [newItemDueDate, setNewItemDueDate] = useState("");
    const config = LEVEL_CONFIG[level];
    const Icon = config.icon;
    const hasContent = (children && React.Children.count(children) > 0) || (tasks && tasks.length > 0);

    const levelLabels = {
        mainGoal: "Misiune",
        subgoal: "Subobiectiv",
        plan: "Plan",
        program: "Program",
        project: "Proiect",
        instruction: "Instrucțiune",
    };

    const childLevelLabels: Record<string, string> = {
        subgoal: "Subobiectiv",
        plan: "Plan",
        program: "Program",
        project: "Proiect",
        instruction: "Instrucțiune",
    };

    const handleAddChild = () => {
        if (newItemTitle.trim() && newItemDueDate && onAddChild) {
            onAddChild(newItemTitle.trim(), newItemDueDate);
            setNewItemTitle("");
            setNewItemDueDate("");
            setIsAdding(false);
        }
    };

    return (
        <div className="relative">
            {/* Connecting line */}
            {level !== "mainGoal" && (
                <div className="absolute left-6 top-0 w-px h-5 bg-border/50" />
            )}

            <div
                className={cn(
                    "flex items-center gap-5 py-5 px-5 rounded-2xl cursor-pointer group",
                    "hover:bg-white/5 transition-colors border-2 border-transparent",
                    "hover:border-white/10",
                    level === "mainGoal" && `bg-gradient-to-r ${config.gradient} text-white`
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <button className="flex-shrink-0 text-muted-foreground">
                    {hasContent || onAddChild ? (
                        isExpanded ? <ChevronDown className="h-7 w-7" /> : <ChevronRight className="h-7 w-7" />
                    ) : (
                        <span className="w-7" />
                    )}
                </button>

                <div className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center",
                    level === "mainGoal" ? "bg-white/20" : config.bg
                )}>
                    <Icon className={cn("h-7 w-7", level === "mainGoal" ? "text-white" : config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Editable title or display title */}
                    {isEditing && onEdit ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        onEdit(editTitle);
                                        setIsEditing(false);
                                    } else if (e.key === "Escape") {
                                        setEditTitle(title);
                                        setIsEditing(false);
                                    }
                                }}
                                className="flex-1 bg-background/50 border border-primary/30 rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                autoFocus
                            />
                            <Button size="sm" onClick={() => { onEdit(editTitle); setIsEditing(false); }}>
                                Salvează
                            </Button>
                            <button
                                className="p-1.5 hover:bg-white/10 rounded-lg"
                                onClick={() => { setEditTitle(title); setIsEditing(false); }}
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </div>
                    ) : (
                        <div className="font-bold text-lg">{title}</div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "text-base",
                            level === "mainGoal" ? "text-white/70" : "text-muted-foreground"
                        )}>
                            {levelLabels[level]}
                        </span>
                        {/* Owner display inline with type label */}
                        {level !== "mainGoal" && assignedUser && (
                            <div className="flex items-center gap-2 text-base">
                                <span className="text-muted-foreground">•</span>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                    {assignedUser.name.charAt(0)}
                                </div>
                                <span className="font-semibold text-primary">{assignedUser.name}</span>
                            </div>
                        )}
                        {level !== "mainGoal" && !assignedUser && (
                            <span className="text-base text-yellow-500 font-medium">• Fără responsabil</span>
                        )}
                    </div>
                </div>

                {/* Owner selector - only on hover */}
                {level !== "mainGoal" && itemId && itemType && users && onOwnerChange && (
                    <div
                        className="flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <select
                            value={assignedUser?.id || ""}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onOwnerChange(itemType, itemId, e.target.value || null)}
                            className={cn(
                                "px-4 py-2.5 rounded-xl text-base font-medium border bg-background",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                assignedUser ? "border-primary/30 text-foreground" : "border-border text-muted-foreground"
                            )}
                        >
                            <option value="">— Fără responsabil —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Add child button - visible on hover */}
                {onAddChild && childLevel && (
                    <button
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(true);
                            setIsAdding(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        {childLevelLabels[childLevel]}
                    </button>
                )}

                {/* Edit button - visible on hover for non-mainGoal items */}
                {level !== "mainGoal" && onEdit && !isEditing && (
                    <button
                        className="p-2 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditTitle(title);
                            setIsEditing(true);
                        }}
                        title="Editează"
                    >
                        <Edit2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                )}

                {/* Delete button - visible on hover for non-mainGoal items */}
                {level !== "mainGoal" && onDelete && (
                    <button
                        className="p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Sigur doriți să ștergeți acest element?")) {
                                onDelete();
                            }
                        }}
                        title="Șterge"
                    >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                    </button>
                )}

                {tasks && tasks.length > 0 && (
                    <span className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium",
                        config.bg, config.color
                    )}>
                        {tasks.length} sarcini
                    </span>
                )}
            </div>

            {isExpanded && (
                <div className="ml-8 border-l-2 border-border/40 pl-4 space-y-1">
                    {/* Add new item input */}
                    {isAdding && onAddChild && childLevel && (
                        <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-card rounded-xl border border-primary/30 shadow-sm" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                placeholder={`Numele ${childLevelLabels[childLevel].toLowerCase()}...`}
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                className="flex-1 min-w-[200px] bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                autoFocus
                            />
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground whitespace-nowrap">Termen:</label>
                                <input
                                    type="date"
                                    value={newItemDueDate}
                                    onChange={(e) => setNewItemDueDate(e.target.value)}
                                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    required
                                />
                            </div>
                            <Button size="sm" onClick={handleAddChild} disabled={!newItemTitle.trim() || !newItemDueDate}>
                                Adaugă
                            </Button>
                            <button
                                className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => { setIsAdding(false); setNewItemTitle(""); setNewItemDueDate(""); }}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {tasks?.map(task => <TaskCard key={task.id} task={task} />)}
                    {children}
                </div>
            )}
        </div>
    );
}

import React from "react";

export function TeamTasks() {
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

    // Fetch all tasks
    const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
        queryKey: ["tasks"],
        queryFn: () => apiRequest("/api/tasks"),
    });

    // Fetch team members
    const { data: users = [] } = useQuery<TeamMember[]>({
        queryKey: ["users"],
        queryFn: () => apiRequest("/api/users"),
    });

    // Fetch ideal scene (hierarchy)
    const { data: idealScene = [] } = useQuery<MainGoal[]>({
        queryKey: ["ideal-scene"],
        queryFn: () => apiRequest("/api/ideal-scene"),
    });

    // Fetch departments
    const { data: departments = [] } = useQuery<Department[]>({
        queryKey: ["departments"],
        queryFn: () => apiRequest("/api/departments"),
    });

    const queryClient = useQueryClient();

    // Mutation to update hierarchy item owner
    const updateOwnerMutation = useMutation({
        mutationFn: async ({ type, id, userId }: { type: string; id: string; userId: string | null }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}/owner`, {
                method: "PUT",
                body: JSON.stringify({ assignedPostId: userId }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
        },
    });

    const handleOwnerChange = (itemType: string, itemId: string, userId: string | null) => {
        updateOwnerMutation.mutate({ type: itemType, id: itemId, userId });
    };

    // Mutations for creating hierarchy items
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

    // Generic update mutation for hierarchy items
    const updateHierarchyMutation = useMutation({
        mutationFn: async ({ type, id, title }: { type: string; id: string; title: string }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}`, {
                method: "PUT",
                body: JSON.stringify({ title }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    // Generic delete mutation for hierarchy items
    const deleteHierarchyMutation = useMutation({
        mutationFn: async ({ type, id }: { type: string; id: string }) => {
            return apiRequest(`/api/ideal-scene/${type}/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideal-scene"] }),
    });

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (selectedMember && task.responsiblePost?.id !== selectedMember) return false;
        if (selectedDepartment && task.department?.id !== selectedDepartment) return false;
        return true;
    });

    // Get tasks for a specific hierarchy item
    const getTasksForItem = (level: string, itemId: string) => {
        return filteredTasks.filter(
            task => task.hierarchyLevel === level && task.parentItemId === itemId
        );
    };

    // Count tasks + hierarchy items per user
    const getTaskCountForUser = (userId: string) => {
        // Count actual tasks
        const taskCount = tasks.filter(task => task.responsiblePost?.id === userId).length;

        // Count hierarchy items assigned to this user
        let hierarchyCount = 0;
        idealScene.forEach(mainGoal => {
            mainGoal.subgoals?.forEach(subgoal => {
                if (subgoal.assignedPostId === userId) hierarchyCount++;
                subgoal.plans?.forEach(plan => {
                    if (plan.assignedPostId === userId) hierarchyCount++;
                    plan.programs?.forEach(program => {
                        if (program.assignedPostId === userId) hierarchyCount++;
                        program.projects?.forEach(project => {
                            if (project.assignedPostId === userId) hierarchyCount++;
                            project.instructions?.forEach(instruction => {
                                if (instruction.assignedPostId === userId) hierarchyCount++;
                            });
                        });
                    });
                });
            });
        });

        return taskCount + hierarchyCount;
    };

    if (tasksLoading) {
        return <div className="text-center py-8 text-muted-foreground">Se încarcă sarcinile...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Sarcini echipă</h1>
                    <p className="text-lg text-muted-foreground mt-1">
                        Structura organizațională și responsabilități
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedDepartment || ""}
                        onChange={(e) => setSelectedDepartment(e.target.value || null)}
                        className="px-4 py-2.5 rounded-xl bg-background border text-sm font-medium"
                    >
                        <option value="">Toate departamentele</option>
                        {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Team Member Filter - Horizontal Tabs */}
            <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-card/50 border border-border/50">
                <button
                    className={cn(
                        "flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all",
                        selectedMember === null
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25"
                            : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSelectedMember(null)}
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                        <div className="font-semibold">Toți</div>
                        <div className="text-xs opacity-75">{tasks.length} sarcini</div>
                    </div>
                </button>

                {users.map(user => (
                    <button
                        key={user.id}
                        className={cn(
                            "flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all",
                            selectedMember === user.id
                                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25"
                                : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setSelectedMember(user.id)}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        <div className="text-left">
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-xs opacity-75">{getTaskCountForUser(user.id)} sarcini</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filter Status */}
            {selectedMember && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Afișare:</span>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {users.find(u => u.id === selectedMember)?.name}
                    </span>
                    <button
                        onClick={() => setSelectedMember(null)}
                        className="text-muted-foreground hover:text-foreground ml-2"
                    >
                        × Șterge filtru
                    </button>
                </div>
            )}

            {/* Hierarchical Tree View - Full Width */}
            <Card className="border-2 border-border/50">
                <CardContent className="p-6 space-y-4">
                    {idealScene.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg">Nu există obiective definite</p>
                            <p className="text-sm">Adaugă un obiectiv principal din pagina Imaginea ideală</p>
                        </div>
                    ) : (
                        idealScene.map((mainGoal) => (
                            <HierarchyNode
                                key={mainGoal.id}
                                title={mainGoal.description || "Misiune"}
                                level="mainGoal"
                                defaultExpanded={true}
                                onAddChild={(title, dueDate) => {
                                    const firstDept = departments[0];
                                    if (firstDept) {
                                        createSubgoalMutation.mutate({ mainGoalId: mainGoal.id, title, departmentId: firstDept.id, dueDate });
                                    }
                                }}
                                childLevel="subgoal"
                            >
                                {mainGoal.subgoals?.filter((subgoal) =>
                                    !selectedDepartment || subgoal.departmentId === selectedDepartment
                                ).map((subgoal) => (
                                    <HierarchyNode
                                        key={subgoal.id}
                                        title={subgoal.title}
                                        level="subgoal"
                                        tasks={getTasksForItem("SUBGOAL", subgoal.id)}
                                        defaultExpanded={true}
                                        itemId={subgoal.id}
                                        itemType="subgoals"
                                        users={users}
                                        onOwnerChange={handleOwnerChange}
                                        assignedUser={subgoal.assignedUser}
                                        onAddChild={(title, dueDate) => createPlanMutation.mutate({ subgoalId: subgoal.id, title, dueDate, departmentId: subgoal.departmentId })}
                                        childLevel="plan"
                                        onEdit={(newTitle) => updateHierarchyMutation.mutate({ type: "subgoals", id: subgoal.id, title: newTitle })}
                                        onDelete={() => deleteHierarchyMutation.mutate({ type: "subgoals", id: subgoal.id })}
                                    >
                                        {subgoal.plans?.map((plan) => (
                                            <HierarchyNode
                                                key={plan.id}
                                                title={plan.title}
                                                level="plan"
                                                tasks={getTasksForItem("PLAN", plan.id)}
                                                itemId={plan.id}
                                                itemType="plans"
                                                users={users}
                                                onOwnerChange={handleOwnerChange}
                                                assignedUser={plan.assignedUser}
                                                onAddChild={(title, dueDate) => createProgramMutation.mutate({ planId: plan.id, title, dueDate })}
                                                childLevel="program"
                                                onEdit={(newTitle) => updateHierarchyMutation.mutate({ type: "plans", id: plan.id, title: newTitle })}
                                                onDelete={() => deleteHierarchyMutation.mutate({ type: "plans", id: plan.id })}
                                            >
                                                {plan.programs?.map((program) => (
                                                    <HierarchyNode
                                                        key={program.id}
                                                        title={program.title}
                                                        level="program"
                                                        tasks={getTasksForItem("PROGRAM", program.id)}
                                                        itemId={program.id}
                                                        itemType="programs"
                                                        users={users}
                                                        onOwnerChange={handleOwnerChange}
                                                        assignedUser={program.assignedUser}
                                                        onAddChild={(title, dueDate) => createProjectMutation.mutate({ programId: program.id, title, dueDate })}
                                                        childLevel="project"
                                                        onEdit={(newTitle) => updateHierarchyMutation.mutate({ type: "programs", id: program.id, title: newTitle })}
                                                        onDelete={() => deleteHierarchyMutation.mutate({ type: "programs", id: program.id })}
                                                    >
                                                        {program.projects?.map((project) => (
                                                            <HierarchyNode
                                                                key={project.id}
                                                                title={project.title}
                                                                level="project"
                                                                tasks={getTasksForItem("PROJECT", project.id)}
                                                                itemId={project.id}
                                                                itemType="projects"
                                                                users={users}
                                                                onOwnerChange={handleOwnerChange}
                                                                assignedUser={project.assignedUser}
                                                                onAddChild={(title, dueDate) => createInstructionMutation.mutate({ projectId: project.id, title, dueDate })}
                                                                childLevel="instruction"
                                                                onEdit={(newTitle) => updateHierarchyMutation.mutate({ type: "projects", id: project.id, title: newTitle })}
                                                                onDelete={() => deleteHierarchyMutation.mutate({ type: "projects", id: project.id })}
                                                            >
                                                                {project.instructions?.map((instruction) => (
                                                                    <HierarchyNode
                                                                        key={instruction.id}
                                                                        title={instruction.title}
                                                                        level="instruction"
                                                                        tasks={getTasksForItem("INSTRUCTION", instruction.id)}
                                                                        itemId={instruction.id}
                                                                        itemType="instructions"
                                                                        users={users}
                                                                        onOwnerChange={handleOwnerChange}
                                                                        assignedUser={instruction.assignedUser}
                                                                        onEdit={(newTitle) => updateHierarchyMutation.mutate({ type: "instructions", id: instruction.id, title: newTitle })}
                                                                        onDelete={() => deleteHierarchyMutation.mutate({ type: "instructions", id: instruction.id })}
                                                                    />
                                                                ))}
                                                            </HierarchyNode>
                                                        ))}
                                                    </HierarchyNode>
                                                ))}
                                            </HierarchyNode>
                                        ))}
                                    </HierarchyNode>
                                ))}
                            </HierarchyNode>
                        ))
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
