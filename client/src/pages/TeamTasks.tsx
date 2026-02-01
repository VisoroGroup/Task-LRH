import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { HierarchyFlowSelector, HierarchyFlowResult } from "@/components/tasks/HierarchyFlowSelector";
import {
    Target,
    FileText,
    Layers,
    FolderKanban,
    ListChecks,
    CheckSquare,
    CheckCircle2,
    Circle,
    Loader2,
    User,
    Plus,
    Calendar,
    Building2,
    FolderTree,
} from "lucide-react";

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
}

interface HierarchyItem {
    id: string;
    title: string;
    type: "subgoal" | "plan" | "program" | "project" | "instruction" | "checklist";
    completedAt?: string | null;
    assignedUser?: { id: string; name: string } | null;
    checklistProgress?: { completed: number; total: number } | null;
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
    assignedUser?: { id: string; name: string } | null;
    completedAt?: string | null;
    plans?: Plan[];
}

interface Plan {
    id: string;
    title: string;
    assignedUser?: { id: string; name: string } | null;
    completedAt?: string | null;
    programs?: Program[];
}

interface Program {
    id: string;
    title: string;
    assignedUser?: { id: string; name: string } | null;
    completedAt?: string | null;
    projects?: Project[];
}

interface Project {
    id: string;
    title: string;
    assignedUser?: { id: string; name: string } | null;
    completedAt?: string | null;
    instructions?: Instruction[];
    checklists?: Checklist[];
}

interface Instruction {
    id: string;
    title: string;
    assignedUser?: { id: string; name: string } | null;
    completedAt?: string | null;
}

interface Checklist {
    id: string;
    title: string;
    assignedUser?: { id: string; name: string } | null;
    items?: { id: string; isCompleted: boolean }[];
}

interface Department {
    id: string;
    name: string;
}

// Level config for styling
const LEVEL_CONFIG = {
    subgoal: {
        icon: Target,
        color: "text-violet-400",
        bg: "bg-violet-500/20",
        border: "border-violet-500/50",
        label: "Obiectiv"
    },
    plan: {
        icon: FileText,
        color: "text-blue-400",
        bg: "bg-blue-500/20",
        border: "border-blue-500/50",
        label: "Plan"
    },
    program: {
        icon: Layers,
        color: "text-emerald-400",
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/50",
        label: "Program"
    },
    project: {
        icon: FolderKanban,
        color: "text-amber-400",
        bg: "bg-amber-500/20",
        border: "border-amber-500/50",
        label: "Proiect"
    },
    instruction: {
        icon: ListChecks,
        color: "text-rose-400",
        bg: "bg-rose-500/20",
        border: "border-rose-500/50",
        label: "De făcut"
    },
    checklist: {
        icon: CheckSquare,
        color: "text-cyan-400",
        bg: "bg-cyan-500/20",
        border: "border-cyan-500/50",
        label: "Checklist"
    },
};

// Single item card in the column
function HierarchyItemCard({
    item,
    onComplete,
    isLoading,
}: {
    item: HierarchyItem;
    onComplete: () => void;
    isLoading: boolean;
}) {
    const config = LEVEL_CONFIG[item.type];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "group relative rounded-xl border p-3 transition-all hover:scale-[1.02]",
                config.bg,
                config.border,
                item.completedAt && "opacity-60"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Completion checkbox */}
                <button
                    className={cn(
                        "flex-shrink-0 p-1 rounded-lg transition-all mt-0.5",
                        item.completedAt
                            ? "bg-green-500/30"
                            : "hover:bg-green-500/20"
                    )}
                    onClick={onComplete}
                    disabled={!!item.completedAt || isLoading}
                    title={item.completedAt ? "Finalizat" : "Marchează ca finalizat"}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-green-500 animate-spin" />
                    ) : item.completedAt ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                        <Circle className="h-4 w-4 text-muted-foreground group-hover:text-green-500" />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    {/* Level badge */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className={cn("p-1 rounded", config.bg)}>
                            <Icon className={cn("h-3 w-3", config.color)} />
                        </div>
                        <span className={cn("text-xs font-medium", config.color)}>
                            {config.label}
                        </span>
                    </div>

                    {/* Title */}
                    <p className={cn(
                        "text-sm font-medium text-foreground line-clamp-2",
                        item.completedAt && "line-through"
                    )}>
                        {item.title}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Team member column
function TeamMemberColumn({
    member,
    items,
    onComplete,
    completingItemId,
}: {
    member: TeamMember;
    items: HierarchyItem[];
    onComplete: (type: string, id: string) => void;
    completingItemId: string | null;
}) {
    const completedCount = items.filter(i => i.completedAt).length;
    const totalCount = items.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="flex-shrink-0 w-72 flex flex-col bg-card/50 backdrop-blur rounded-2xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border/50 bg-gradient-to-br from-background to-card">
                <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                        <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center ring-2 ring-primary/30">
                            <span className="text-white font-bold text-sm">
                                {member.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                            {member.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {completedCount}/{totalCount} finalizate
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Items list */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Niciun de făcut atribuit
                    </div>
                ) : (
                    items.map((item) => (
                        <HierarchyItemCard
                            key={`${item.type}-${item.id}`}
                            item={item}
                            onComplete={() => onComplete(item.type + "s", item.id)}
                            isLoading={completingItemId === item.id}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export function TeamTasks() {
    const queryClient = useQueryClient();
    const { user, hasRole } = useAuth();
    const { toast } = useToast();
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [completingItemId, setCompletingItemId] = useState<string | null>(null);

    // Task creation modal state
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDate, setNewTaskDate] = useState("");
    const [newTaskTime, setNewTaskTime] = useState("");
    const [newTaskDepartmentId, setNewTaskDepartmentId] = useState("");
    const [newTaskResponsiblePostId, setNewTaskResponsiblePostId] = useState("");
    const [hierarchyResult, setHierarchyResult] = useState<HierarchyFlowResult | null>(null);
    const [isCreatingHierarchy, setIsCreatingHierarchy] = useState(false);

    // Check if user is admin (CEO or EXECUTIVE can see all)
    const isAdmin = hasRole("CEO", "EXECUTIVE");

    // Fetch hierarchy data
    const { data: hierarchy = [], isLoading } = useQuery<MainGoal[]>({
        queryKey: ["ideal-scene"],
        queryFn: async (): Promise<MainGoal[]> => {
            const res = await apiRequest("/api/ideal-scene");
            return res as MainGoal[];
        },
    });

    // Fetch users
    const { data: users = [] } = useQuery<TeamMember[]>({
        queryKey: ["users"],
        queryFn: async (): Promise<TeamMember[]> => {
            const res = await apiRequest("/api/users");
            return res as TeamMember[];
        },
    });

    // Fetch departments with posts to know user's assigned posts
    const { data: departments = [] } = useQuery<(Department & { posts?: { id: string; name: string; userId: string | null; user: { id: string; name: string } | null }[] })[]>({
        queryKey: ["departments"],
        queryFn: async (): Promise<(Department & { posts?: { id: string; name: string; userId: string | null; user: { id: string; name: string } | null }[] })[]> => {
            const res = await apiRequest("/api/departments");
            return res as any;
        },
    });

    // Get current user's post IDs for filtering
    const userPostIds = React.useMemo(() => {
        if (!user || isAdmin) return null; // Null means show all
        const postIds: string[] = [];
        departments.forEach(dept => {
            dept.posts?.forEach(post => {
                if (post.userId === user.id) {
                    postIds.push(post.id);
                }
            });
        });
        return postIds;
    }, [user, departments, isAdmin]);

    // Complete hierarchy item mutation
    const completeHierarchyMutation = useMutation({
        mutationFn: async ({ type, id }: { type: string; id: string }) => {
            setCompletingItemId(id);
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
            setCompletingItemId(null);
        },
        onError: (error: Error) => {
            toast({
                title: "Eroare",
                description: error.message || "Nu s-a putut finaliza elementul.",
                variant: "destructive",
            });
            setCompletingItemId(null);
        },
    });

    // Collect all hierarchy items and group by user
    const itemsByUser = React.useMemo(() => {
        const result: Map<string, HierarchyItem[]> = new Map();

        // Initialize with all users
        users.forEach(u => result.set(u.id, []));

        // Collect items from hierarchy
        hierarchy.forEach((mainGoal) => {
            mainGoal.subgoals?.forEach((subgoal) => {
                // Filter by department if selected
                if (selectedDepartment && subgoal.departmentId !== selectedDepartment) return;

                if (subgoal.assignedUser) {
                    const items = result.get(subgoal.assignedUser.id) || [];
                    items.push({
                        id: subgoal.id,
                        title: subgoal.title,
                        type: "subgoal",
                        completedAt: subgoal.completedAt,
                        assignedUser: subgoal.assignedUser,
                    });
                    result.set(subgoal.assignedUser.id, items);
                }

                subgoal.plans?.forEach((plan) => {
                    if (plan.assignedUser) {
                        const items = result.get(plan.assignedUser.id) || [];
                        items.push({
                            id: plan.id,
                            title: plan.title,
                            type: "plan",
                            completedAt: plan.completedAt,
                            assignedUser: plan.assignedUser,
                        });
                        result.set(plan.assignedUser.id, items);
                    }

                    plan.programs?.forEach((program) => {
                        if (program.assignedUser) {
                            const items = result.get(program.assignedUser.id) || [];
                            items.push({
                                id: program.id,
                                title: program.title,
                                type: "program",
                                completedAt: program.completedAt,
                                assignedUser: program.assignedUser,
                            });
                            result.set(program.assignedUser.id, items);
                        }

                        program.projects?.forEach((project) => {
                            if (project.assignedUser) {
                                const items = result.get(project.assignedUser.id) || [];
                                items.push({
                                    id: project.id,
                                    title: project.title,
                                    type: "project",
                                    completedAt: project.completedAt,
                                    assignedUser: project.assignedUser,
                                });
                                result.set(project.assignedUser.id, items);
                            }

                            project.instructions?.forEach((instruction) => {
                                if (instruction.assignedUser) {
                                    const items = result.get(instruction.assignedUser.id) || [];
                                    items.push({
                                        id: instruction.id,
                                        title: instruction.title,
                                        type: "instruction",
                                        completedAt: instruction.completedAt,
                                        assignedUser: instruction.assignedUser,
                                    });
                                    result.set(instruction.assignedUser.id, items);
                                }
                            });

                            // Add checklists
                            project.checklists?.forEach((checklist) => {
                                if (checklist.assignedUser) {
                                    const items = result.get(checklist.assignedUser.id) || [];
                                    const completed = checklist.items?.filter(i => i.isCompleted).length || 0;
                                    const total = checklist.items?.length || 0;
                                    items.push({
                                        id: checklist.id,
                                        title: checklist.title,
                                        type: "checklist",
                                        completedAt: total > 0 && completed === total ? new Date().toISOString() : null,
                                        assignedUser: checklist.assignedUser,
                                        checklistProgress: { completed, total },
                                    });
                                    result.set(checklist.assignedUser.id, items);
                                }
                            });
                        });
                    });
                });
            });
        });

        return result;
    }, [hierarchy, users, selectedDepartment]);

    // Get users who have items assigned (filtered by permissions)
    const usersWithItems = React.useMemo(() => {
        // If regular user, only show their own column
        if (userPostIds !== null && user) {
            // Filter to only show current user if they have items
            const currentUser = users.find(u => u.id === user.id);
            const userItems = currentUser ? (itemsByUser.get(currentUser.id) || []) : [];
            // Only include items that are assigned to user's posts
            // Since hierarchy items use assignedPostId, we need to also check that
            return userItems.length > 0 ? [currentUser!] : [];
        }

        // Admin sees all users with items
        return users.filter(u => {
            const items = itemsByUser.get(u.id) || [];
            return items.length > 0;
        });
    }, [users, itemsByUser, userPostIds, user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-pink-400">
                        De făcut
                    </h1>
                    <p className="text-lg text-muted-foreground mt-1">
                        {isAdmin ? "Toate de făcut ale echipei" : "De făcut tale"}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsNewTaskOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                    >
                        <Plus className="h-4 w-4" />
                        De făcut nou
                    </Button>
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
            </div>

            {/* Team columns - horizontal scroll */}
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                    {usersWithItems.length === 0 ? (
                        <Card className="w-full">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Nu există de făcut atribuite.</p>
                                <p className="text-sm mt-1">
                                    Atribuiți responsabili în Ideal Scene pentru a vedea de făcut aici.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        usersWithItems.map((member) => (
                            <TeamMemberColumn
                                key={member.id}
                                member={member}
                                items={itemsByUser.get(member.id) || []}
                                onComplete={(type, id) => completeHierarchyMutation.mutate({ type, id })}
                                completingItemId={completingItemId}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* New Task Dialog */}
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogContent className="max-w-4xl w-[80vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Creează de făcut nou</DialogTitle>
                        <DialogDescription>
                            Adaugă un de făcut nou cu toate informațiile necesare
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left column - Basic Info */}
                        <div className="space-y-4">
                            {/* Task Title */}
                            <div>
                                <label className="text-sm font-medium">Titlu *</label>
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    placeholder="Ce trebuie făcut?"
                                />
                            </div>

                            {/* Department Selection */}
                            <div>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Departament *
                                </label>
                                <select
                                    value={newTaskDepartmentId}
                                    onChange={(e) => {
                                        setNewTaskDepartmentId(e.target.value);
                                        setNewTaskResponsiblePostId("");
                                        setHierarchyResult(null);
                                    }}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                >
                                    <option value="">Selectează departament...</option>
                                    {departments?.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Responsible Post */}
                            <div>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Postul responsabil *
                                </label>
                                <select
                                    value={newTaskResponsiblePostId}
                                    onChange={(e) => setNewTaskResponsiblePostId(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    disabled={!newTaskDepartmentId}
                                >
                                    <option value="">{newTaskDepartmentId ? "Selectează postul..." : "Întâi selectează departament"}</option>
                                    {departments?.find(d => d.id === newTaskDepartmentId)?.posts?.map(post => (
                                        <option key={post.id} value={post.id}>
                                            📌 {post.name} {post.user ? `(${post.user.name})` : "(Vacant)"}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Data limită *
                                </label>
                                <input
                                    type="date"
                                    value={newTaskDate}
                                    onChange={(e) => setNewTaskDate(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    required
                                />
                            </div>

                            {/* Time (optional) */}
                            <div>
                                <label className="text-sm font-medium">Ora (opțional)</label>
                                <input
                                    type="time"
                                    value={newTaskTime}
                                    onChange={(e) => setNewTaskTime(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                />
                            </div>
                        </div>

                        {/* Right column - Hierarchy Flow */}
                        <div className="border-l pl-6">
                            <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <FolderTree className="h-4 w-4" />
                                Ierarhie *
                            </div>
                            <HierarchyFlowSelector
                                departmentId={newTaskDepartmentId}
                                idealScene={hierarchy || []}
                                onSelectionComplete={setHierarchyResult}
                                onCreatingChange={setIsCreatingHierarchy}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>
                            Renunță
                        </Button>
                        <Button
                            onClick={async () => {
                                // Validate all required fields
                                if (!newTaskTitle.trim()) {
                                    toast({ title: "Titlul este obligatoriu", variant: "destructive" });
                                    return;
                                }
                                if (!newTaskDate) {
                                    toast({ title: "Data limită este obligatorie", variant: "destructive" });
                                    return;
                                }
                                if (!newTaskDepartmentId) {
                                    toast({ title: "Departamentul este obligatoriu", variant: "destructive" });
                                    return;
                                }
                                if (!newTaskResponsiblePostId) {
                                    toast({ title: "Persoana responsabilă este obligatorie", variant: "destructive" });
                                    return;
                                }

                                if (!hierarchyResult) {
                                    toast({ title: "Selectează sau creează ierarhia", variant: "destructive" });
                                    return;
                                }

                                const dueDate = newTaskTime
                                    ? `${newTaskDate}T${newTaskTime}:00`
                                    : `${newTaskDate}T23:59:59`;

                                try {
                                    let parentItemId = hierarchyResult.parentItemId;
                                    let hierarchyLevel = hierarchyResult.hierarchyLevel;

                                    // Handle new hierarchy creation mode
                                    if (hierarchyResult.mode === "new" && hierarchyResult.newSubgoal) {
                                        // Create subgoal
                                        const subgoalRes = await apiRequest("/api/ideal-scene/subgoal", {
                                            method: "POST",
                                            body: JSON.stringify({
                                                title: hierarchyResult.newSubgoal,
                                                departmentId: newTaskDepartmentId,
                                                dueDate: dueDate,
                                            }),
                                        });
                                        const newSubgoalId = (subgoalRes as any).id;

                                        // Create plan
                                        const planRes = await apiRequest("/api/ideal-scene/plan", {
                                            method: "POST",
                                            body: JSON.stringify({
                                                title: hierarchyResult.newPlan,
                                                subgoalId: newSubgoalId,
                                                departmentId: newTaskDepartmentId,
                                                dueDate: dueDate,
                                            }),
                                        });
                                        const newPlanId = (planRes as any).id;

                                        // Create program
                                        const programRes = await apiRequest("/api/ideal-scene/program", {
                                            method: "POST",
                                            body: JSON.stringify({
                                                title: hierarchyResult.newProgram,
                                                planId: newPlanId,
                                                departmentId: newTaskDepartmentId,
                                                dueDate: dueDate,
                                            }),
                                        });
                                        const newProgramId = (programRes as any).id;

                                        // Create project if needed
                                        if (hierarchyResult.newProject) {
                                            const projectRes = await apiRequest("/api/ideal-scene/project", {
                                                method: "POST",
                                                body: JSON.stringify({
                                                    title: hierarchyResult.newProject,
                                                    programId: newProgramId,
                                                    departmentId: newTaskDepartmentId,
                                                    dueDate: dueDate,
                                                }),
                                            });
                                            parentItemId = (projectRes as any).id;
                                            hierarchyLevel = "PROJECT";
                                        } else {
                                            parentItemId = newProgramId;
                                            hierarchyLevel = "PROGRAM";
                                        }
                                    }

                                    // Create the task
                                    await apiRequest("/api/tasks", {
                                        method: "POST",
                                        body: JSON.stringify({
                                            title: newTaskTitle,
                                            dueDate,
                                            departmentId: newTaskDepartmentId,
                                            responsiblePostId: newTaskResponsiblePostId,
                                            hierarchyLevel,
                                            parentItemId,
                                            creatorId: user?.id || "",
                                        }),
                                    });

                                    queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
                                    toast({ title: "De făcut creat!", variant: "success" as any });
                                    setIsNewTaskOpen(false);
                                    // Reset form
                                    setNewTaskTitle("");
                                    setNewTaskDate("");
                                    setNewTaskTime("");
                                    setNewTaskDepartmentId("");
                                    setNewTaskResponsiblePostId("");
                                    setHierarchyResult(null);
                                } catch (error: any) {
                                    toast({ title: "Nu s-a putut crea de făcut", description: error.message, variant: "destructive" });
                                }
                            }}
                            disabled={
                                !newTaskTitle.trim() ||
                                !newTaskDate ||
                                !newTaskDepartmentId ||
                                !newTaskResponsiblePostId ||
                                !hierarchyResult
                            }
                        >
                            {isCreatingHierarchy ? "Creează ierarhie și de făcut" : "Creează de făcut"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
