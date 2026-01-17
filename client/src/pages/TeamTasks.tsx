import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

interface Task {
    id: string;
    title: string;
    status: "TODO" | "DOING" | "DONE";
    hierarchyLevel: string;
    parentItemId: string;
    dueDate: string | null;
    department: { id: string; name: string };
    responsibleUser?: { id: string; name: string; email: string };
    mainGoalTitle?: string | null;
    hierarchyPath?: string[];
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface MainGoal {
    id: string;
    title: string;
    subgoals: Subgoal[];
}

interface Subgoal {
    id: string;
    title: string;
    departmentId: string;
    assignedUserId?: string | null;
    assignedUser?: { id: string; name: string };
    plans?: Plan[];
}

interface Plan {
    id: string;
    title: string;
    assignedUserId?: string | null;
    assignedUser?: { id: string; name: string };
    programs?: Program[];
}

interface Program {
    id: string;
    title: string;
    assignedUserId?: string | null;
    assignedUser?: { id: string; name: string };
    projects?: Project[];
}

interface Project {
    id: string;
    title: string;
    assignedUserId?: string | null;
    assignedUser?: { id: string; name: string };
    instructions?: Instruction[];
}

interface Instruction {
    id: string;
    title: string;
    assignedUserId?: string | null;
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
                        {task.responsibleUser && (
                            <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.responsibleUser.name}
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
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
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

    return (
        <div className="relative">
            {/* Connecting line */}
            {level !== "mainGoal" && (
                <div className="absolute left-4 top-0 w-px h-4 bg-border/50" />
            )}

            <div
                className={cn(
                    "flex items-center gap-4 py-4 px-4 rounded-xl cursor-pointer group",
                    "hover:bg-white/5 transition-colors border border-transparent",
                    "hover:border-white/10",
                    level === "mainGoal" && `bg-gradient-to-r ${config.gradient} text-white`
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <button className="flex-shrink-0 text-muted-foreground">
                    {hasContent ? (
                        isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />
                    ) : (
                        <span className="w-5" />
                    )}
                </button>

                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                    level === "mainGoal" ? "bg-white/20" : config.bg
                )}>
                    <Icon className={cn("h-5 w-5", level === "mainGoal" ? "text-white" : config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base">{title}</div>
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "text-sm",
                            level === "mainGoal" ? "text-white/70" : "text-muted-foreground"
                        )}>
                            {levelLabels[level]}
                        </span>
                        {/* Owner display inline with type label */}
                        {level !== "mainGoal" && assignedUser && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">•</span>
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                                    {assignedUser.name.charAt(0)}
                                </div>
                                <span className="font-medium text-primary">{assignedUser.name}</span>
                            </div>
                        )}
                        {level !== "mainGoal" && !assignedUser && (
                            <span className="text-sm text-yellow-500">• Fără responsabil</span>
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
                                "px-3 py-2 rounded-lg text-sm font-medium border bg-background",
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
                body: JSON.stringify({ assignedUserId: userId }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
        },
    });

    const handleOwnerChange = (itemType: string, itemId: string, userId: string | null) => {
        updateOwnerMutation.mutate({ type: itemType, id: itemId, userId });
    };

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (selectedMember && task.responsibleUser?.id !== selectedMember) return false;
        if (selectedDepartment && task.department?.id !== selectedDepartment) return false;
        return true;
    });

    // Get tasks for a specific hierarchy item
    const getTasksForItem = (level: string, itemId: string) => {
        return filteredTasks.filter(
            task => task.hierarchyLevel === level && task.parentItemId === itemId
        );
    };

    // Count tasks per user
    const getTaskCountForUser = (userId: string) => {
        return tasks.filter(task => task.responsibleUser?.id === userId).length;
    };

    if (tasksLoading) {
        return <div className="text-center py-8 text-muted-foreground">Se încarcă sarcinile...</div>;
    }

    return (
        <div className="flex gap-6">
            {/* Left Sidebar - Team Members */}
            <Card className="w-64 flex-shrink-0">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Membrii echipei
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    <button
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                            selectedMember === null
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-white/5"
                        )}
                        onClick={() => setSelectedMember(null)}
                    >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">Toți</div>
                            <div className="text-xs text-muted-foreground">{tasks.length} sarcini</div>
                        </div>
                    </button>

                    {users.map(user => (
                        <button
                            key={user.id}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                                selectedMember === user.id
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-white/5"
                            )}
                            onClick={() => setSelectedMember(user.id)}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {getTaskCountForUser(user.id)} sarcini
                                </div>
                            </div>
                        </button>
                    ))}
                </CardContent>
            </Card>

            {/* Main Content - Hierarchical Tree */}
            <div className="flex-1 space-y-4">
                {/* Header with filters */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Sarcini echipă</h2>
                        <p className="text-muted-foreground">
                            {filteredTasks.length} sarcini
                            {selectedMember && ` pentru ${users.find(u => u.id === selectedMember)?.name}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={selectedDepartment || ""}
                            onChange={(e) => setSelectedDepartment(e.target.value || null)}
                            className="px-3 py-2 rounded-lg bg-background border text-sm"
                        >
                            <option value="">Toate departamentele</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Hierarchical Tree View */}
                <Card>
                    <CardContent className="p-4 space-y-2">
                        {idealScene.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nu există obiective definite
                            </div>
                        ) : (
                            idealScene.map((mainGoal) => (
                                <HierarchyNode
                                    key={mainGoal.id}
                                    title={mainGoal.title}
                                    level="mainGoal"
                                    defaultExpanded={true}
                                >
                                    {mainGoal.subgoals?.map((subgoal) => (
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
            </div>
        </div>
    );
}
