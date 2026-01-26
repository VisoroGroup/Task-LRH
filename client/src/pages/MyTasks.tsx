import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, cn, formatDate, statusLabels, hierarchyLabels } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { HierarchyTreeSelector } from "@/components/tasks/HierarchyTreeSelector";
import {
    Plus,
    Check,
    Clock,
    AlertCircle,
    Calendar,
    Building2,
    User,
    FolderTree,
    ChevronRight,
} from "lucide-react";

interface HierarchyItem {
    title: string;
    level: string;
    dueDate?: string | null;
    assignedUser?: { id: string; name: string } | null;
}

interface Task {
    id: string;
    title: string;
    status: "TODO" | "DOING" | "DONE";
    hierarchyLevel: string;
    parentItemId: string;
    dueDate: string | null;
    lastUpdatedAt: string;
    department: { id: string; name: string };
    completionReport: any;
    hierarchyPath?: HierarchyItem[];
    mainGoalTitle?: string | null;
    responsiblePost?: {
        id: string;
        name: string;
        user: { id: string; name: string } | null;
    };
}

interface Department {
    id: string;
    name: string;
    posts: Post[];
}

interface UserType {
    id: string;
    name: string;
    email: string;
}

interface Post {
    id: string;
    name: string;
    userId: string | null;
    user: { id: string; name: string } | null;
}

export function MyTasks() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDate, setNewTaskDate] = useState("");
    const [newTaskTime, setNewTaskTime] = useState("");

    // New required fields
    const [newTaskDepartmentId, setNewTaskDepartmentId] = useState("");
    const [newTaskResponsiblePostId, setNewTaskResponsiblePostId] = useState("");

    // Hierarchy selection state (unified for tree selector)
    const [hierarchyPath, setHierarchyPath] = useState({
        subgoalId: "",
        planId: "",
        programId: "",
        projectId: "",
        instructionId: "",
    });

    // Recurring task state
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceType, setRecurrenceType] = useState("WEEKLY");
    const [recurrenceInterval, setRecurrenceInterval] = useState(1);
    const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState(1); // Monday
    const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(1);

    // Completion report dialog state
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState<string>("");
    const [completingTaskTitle, setCompletingTaskTitle] = useState<string>("");
    const [whatWasDone, setWhatWasDone] = useState("");
    const [whenDone, setWhenDone] = useState("");
    const [whereContext, setWhereContext] = useState("");
    const [evidenceType, setEvidenceType] = useState<string>("");
    const [evidenceUrl, setEvidenceUrl] = useState("");

    // Hierarchy popup state
    const [hierarchyTask, setHierarchyTask] = useState<Task | null>(null);

    // Fetch departments
    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: () => apiRequest<Department[]>("/api/departments"),
    });

    // Fetch users
    const { data: users } = useQuery({
        queryKey: ["users"],
        queryFn: () => apiRequest<UserType[]>("/api/users"),
    });

    // Fetch ideal scene hierarchy
    const { data: idealScene } = useQuery({
        queryKey: ["ideal-scene"],
        queryFn: () => apiRequest<any[]>("/api/ideal-scene"),
    });

    // Determine the lowest selected level and its ID for task creation
    const getParentInfo = () => {
        if (hierarchyPath.projectId) return { level: "PROJECT", parentId: hierarchyPath.projectId };
        if (hierarchyPath.programId) return { level: "PROGRAM", parentId: hierarchyPath.programId };
        if (hierarchyPath.planId) return { level: "PLAN", parentId: hierarchyPath.planId };
        if (hierarchyPath.subgoalId) return { level: "SUBGOAL", parentId: hierarchyPath.subgoalId };
        return { level: "", parentId: "" };
    };

    // Get current user for filtering
    const { user } = useAuth();

    // Filter tasks by current user's posts
    const { data: tasks, isLoading } = useQuery({
        queryKey: ["my-tasks", statusFilter, user?.id],
        queryFn: () => {
            if (!user?.id) return [];
            const params = new URLSearchParams();
            if (statusFilter) params.append("status", statusFilter);
            const queryString = params.toString();
            return apiRequest<Task[]>(`/api/tasks/my/${user.id}${queryString ? `?${queryString}` : ""}`);
        },
        enabled: !!user?.id,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
            return apiRequest(`/api/tasks/${taskId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
            toast({ title: "Task updated", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({
                title: "Cannot update task",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    // Complete task with evidence
    const completeTaskMutation = useMutation({
        mutationFn: async (data: {
            taskId: string;
            whatWasDone: string;
            whenDone: string;
            whereContext: string;
            evidenceType: string;
            evidenceUrl?: string;
            submittedById: string;
        }) => {
            return apiRequest(`/api/tasks/${data.taskId}/complete`, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
            toast({ title: "Task completed with report!", variant: "success" as any });
            setIsCompleteDialogOpen(false);
            // Reset form
            setWhatWasDone("");
            setWhenDone("");
            setWhereContext("");
            setEvidenceType("");
            setEvidenceUrl("");
            setCompletingTaskId("");
            setCompletingTaskTitle("");
        },
        onError: (error: Error) => {
            toast({
                title: "Cannot complete task",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleCompleteTask = () => {
        if (!whatWasDone.trim() || !whenDone || !whereContext.trim() || !evidenceType) {
            toast({ title: "All fields are required", variant: "destructive" });
            return;
        }
        if (evidenceType === "URL" && !evidenceUrl.trim()) {
            toast({ title: "URL is required for URL evidence type", variant: "destructive" });
            return;
        }

        // Use first user as submitter for now
        const submittedById = users?.[0]?.id || "";

        completeTaskMutation.mutate({
            taskId: completingTaskId,
            whatWasDone,
            whenDone,
            whereContext,
            evidenceType,
            evidenceUrl: evidenceType === "URL" ? evidenceUrl : undefined,
            submittedById,
        });
    };

    // Mutations for creating hierarchy items inline (called from HierarchyTreeSelector)
    const createSubgoalMutation = useMutation({
        mutationFn: async (data: { title: string; mainGoalId: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/subgoals", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            setHierarchyPath(prev => ({ ...prev, subgoalId: result.id, planId: "", programId: "", projectId: "", instructionId: "" }));
            toast({ title: "Subobiectiv creat!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "A apărut o eroare", description: error.message, variant: "destructive" });
        },
    });

    const createPlanMutation = useMutation({
        mutationFn: async (data: { title: string; subgoalId: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/plans", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            setHierarchyPath(prev => ({ ...prev, planId: result.id, programId: "", projectId: "", instructionId: "" }));
            toast({ title: "Plan creat!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Hiba történt", description: error.message, variant: "destructive" });
        },
    });

    const createProgramMutation = useMutation({
        mutationFn: async (data: { title: string; planId: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/programs", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            setHierarchyPath(prev => ({ ...prev, programId: result.id, projectId: "", instructionId: "" }));
            toast({ title: "Program creat!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Hiba történt", description: error.message, variant: "destructive" });
        },
    });

    const createProjectMutation = useMutation({
        mutationFn: async (data: { title: string; programId: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/projects", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            setHierarchyPath(prev => ({ ...prev, projectId: result.id, instructionId: "" }));
            toast({ title: "Proiect creat!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Hiba történt", description: error.message, variant: "destructive" });
        },
    });

    const createInstructionMutation = useMutation({
        mutationFn: async (data: { title: string; projectId: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/instructions", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            setHierarchyPath(prev => ({ ...prev, instructionId: result.id }));
            toast({ title: "Instrucțiune creată!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Hiba történt", description: error.message, variant: "destructive" });
        },
    });

    // Get the main goal for the company (one main goal shared by all departments)
    const getMainGoal = () => {
        if (!idealScene || idealScene.length === 0) return null;
        return idealScene[0]; // The first (and only) main goal
    };

    const createTaskMutation = useMutation({
        mutationFn: async (data: {
            title: string;
            dueDate: string;
            departmentId: string;
            responsiblePostId: string;
            hierarchyLevel: string;
            parentItemId: string;
            creatorId: string;
            isRecurring?: boolean;
            recurrenceType?: string;
            recurrenceInterval?: number;
            recurrenceDayOfWeek?: number | null;
            recurrenceDayOfMonth?: number | null;
        }) => {
            return apiRequest("/api/tasks", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
            toast({ title: "Sarcină creată", variant: "success" as any });
            setIsNewTaskOpen(false);
            // Reset all fields
            setNewTaskTitle("");
            setNewTaskDate("");
            setNewTaskTime("");
            setNewTaskDepartmentId("");
            setNewTaskResponsiblePostId("");
            // Reset hierarchy path
            setHierarchyPath({ subgoalId: "", planId: "", programId: "", projectId: "", instructionId: "" });
        },
        onError: (error: Error) => {
            toast({
                title: "Nu s-a putut crea sarcina",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleCreateTask = () => {
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

        const parentInfo = getParentInfo();
        if (!parentInfo.parentId) {
            toast({ title: "Selectează cel puțin un Obiectiv", variant: "destructive" });
            return;
        }

        const dueDate = newTaskTime
            ? `${newTaskDate}T${newTaskTime}:00`
            : `${newTaskDate}T23:59:59`;

        // Use first user as creatorId for now (in production, use logged-in user)
        const creatorId = users?.[0]?.id || "";

        createTaskMutation.mutate({
            title: newTaskTitle,
            dueDate,
            departmentId: newTaskDepartmentId,
            responsiblePostId: newTaskResponsiblePostId,
            hierarchyLevel: parentInfo.level,
            parentItemId: parentInfo.parentId,
            creatorId,
            // Recurring task fields
            isRecurring,
            recurrenceType: isRecurring ? recurrenceType : "NONE",
            recurrenceInterval: isRecurring ? recurrenceInterval : 1,
            recurrenceDayOfWeek: isRecurring && recurrenceType === "WEEKLY" ? recurrenceDayOfWeek : null,
            recurrenceDayOfMonth: isRecurring && recurrenceType === "MONTHLY" ? recurrenceDayOfMonth : null,
        });
    };

    const filteredTasks = tasks || [];

    const todoTasks = filteredTasks.filter(t => t.status === "TODO");
    const doingTasks = filteredTasks.filter(t => t.status === "DOING");
    const doneTasks = filteredTasks.filter(t => t.status === "DONE");

    const TaskCard = ({ task }: { task: Task }) => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

        return (
            <div className={cn(
                "p-4 border rounded-lg hover:shadow-md transition-all",
                isOverdue && "border-red-300 dark:border-red-800"
            )}>
                <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        `hierarchy-${task.hierarchyLevel.toLowerCase()}`
                    )}>
                        {hierarchyLabels[task.hierarchyLevel]}
                    </span>
                    {isOverdue && (
                        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Întârziat
                        </span>
                    )}
                </div>

                {/* Main Goal Display - Always fully visible and prominent */}
                {task.mainGoalTitle && (
                    <div className="mb-3 p-2.5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-300 dark:border-violet-600/50 rounded-lg">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">🎯</span>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold mb-0.5">
                                    Misiune
                                </div>
                                <div className="text-sm font-bold text-violet-700 dark:text-violet-300">
                                    {task.mainGoalTitle}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <h4 className="font-medium mb-1">{task.title}</h4>

                {/* Hierarchy popup button - Always visible and prominent */}
                {task.hierarchyPath && task.hierarchyPath.length > 0 && (
                    <button
                        onClick={() => setHierarchyTask(task)}
                        className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-primary/50 mb-2"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <FolderTree className="h-4 w-4" />
                            Vizualizează fluxul complet
                        </div>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                    {task.responsiblePost && (
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Responsabil: {task.responsiblePost.name}
                        </div>
                    )}
                    <div>Departament: {task.department?.name}</div>
                    {task.dueDate && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Termen: {formatDate(task.dueDate)}
                        </div>
                    )}
                </div>

                {/* Status change buttons */}
                <div className="flex gap-2 mt-3">
                    {task.status === "TODO" && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "DOING" })}
                        >
                            Începe lucru
                        </Button>
                    )}
                    {task.status === "DOING" && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "TODO" })}
                                className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                                ↩ Înapoi
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "DONE" })}
                            >
                                <Check className="h-3 w-3 mr-1" />
                                Finalizează
                            </Button>
                        </>
                    )}
                    {task.status === "DONE" && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "TODO" })}
                            className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        >
                            ↩ Înapoi la De făcut
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    // Render a single column
    const renderColumn = (title: string, tasks: Task[], dotColor: string, statusKey: string) => (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    {title}
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                        {tasks.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {tasks.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                        Nicio sarcină {title.toLowerCase()}
                    </div>
                ) : (
                    statusKey === "DONE"
                        ? tasks.slice(0, 5).map((task) => <TaskCard key={task.id} task={task} />)
                        : tasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
                {statusKey === "DONE" && tasks.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground">
                        +{tasks.length - 5} sarcini finalizateîn plus
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Se încarcă sarcinile...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Sarcinile mele</h2>
                    <p className="text-muted-foreground">Pașii de acțiune atribuiți ție</p>
                </div>
                <Button onClick={() => setIsNewTaskOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Sarcină nouă
                </Button>
            </div>

            {/* New Task Dialog */}
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogContent className="max-w-4xl w-[80vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Creează sarcină nouă</DialogTitle>
                        <DialogDescription>
                            Adaugă o sarcină nouă cu toate informațiile necesare
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left column - Basic Info */}
                        <div className="space-y-4">
                            {/* Task Title */}
                            <div>
                                <label className="text-sm font-medium">Titlul sarcinii *</label>
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
                                        // Reset hierarchy selection
                                        setHierarchyPath({ subgoalId: "", planId: "", programId: "", projectId: "", instructionId: "" });
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

                            {/* Recurring Task Toggle */}
                            <div className="border-t pt-4 mt-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium">🔄 Sarcină repetitivă</span>
                                </label>

                                {isRecurring && (
                                    <div className="mt-4 space-y-3 p-3 bg-muted/50 rounded-lg">
                                        {/* Recurrence Type */}
                                        <div>
                                            <label className="text-sm font-medium">Frecvență</label>
                                            <select
                                                value={recurrenceType}
                                                onChange={(e) => setRecurrenceType(e.target.value)}
                                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                            >
                                                <option value="DAILY">Zilnic</option>
                                                <option value="WEEKLY">Săptămânal</option>
                                                <option value="MONTHLY">Lunar</option>
                                                <option value="YEARLY">Anual</option>
                                            </select>
                                        </div>

                                        {/* Interval */}
                                        <div>
                                            <label className="text-sm font-medium">
                                                La fiecare {recurrenceInterval} {recurrenceType === "DAILY" ? "zi(le)" : recurrenceType === "WEEKLY" ? "săpt." : recurrenceType === "MONTHLY" ? "lună(i)" : "an(i)"}
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={recurrenceInterval}
                                                onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                            />
                                        </div>

                                        {/* Day of Week for WEEKLY */}
                                        {recurrenceType === "WEEKLY" && (
                                            <div>
                                                <label className="text-sm font-medium">Ziua săptămânii</label>
                                                <select
                                                    value={recurrenceDayOfWeek}
                                                    onChange={(e) => setRecurrenceDayOfWeek(parseInt(e.target.value))}
                                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                                >
                                                    <option value={1}>Luni</option>
                                                    <option value={2}>Marți</option>
                                                    <option value={3}>Miercuri</option>
                                                    <option value={4}>Joi</option>
                                                    <option value={5}>Vineri</option>
                                                    <option value={6}>Sâmbătă</option>
                                                    <option value={0}>Duminică</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Day of Month for MONTHLY */}
                                        {recurrenceType === "MONTHLY" && (
                                            <div>
                                                <label className="text-sm font-medium">Ziua lunii</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={31}
                                                    value={recurrenceDayOfMonth}
                                                    onChange={(e) => setRecurrenceDayOfMonth(parseInt(e.target.value) || 1)}
                                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right column - Hierarchy Tree */}
                        <div className="border-l pl-6">
                            <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <FolderTree className="h-4 w-4" />
                                Ierarhie *
                            </div>
                            <HierarchyTreeSelector
                                departmentId={newTaskDepartmentId}
                                idealScene={idealScene || []}
                                selectedPath={hierarchyPath}
                                onSelectionChange={setHierarchyPath}
                                onCreateSubgoal={(title) => {
                                    const mainGoal = getMainGoal();
                                    if (mainGoal) {
                                        createSubgoalMutation.mutate({
                                            title,
                                            mainGoalId: mainGoal.id,
                                            departmentId: newTaskDepartmentId,
                                        });
                                    } else {
                                        toast({ title: "Eroare: Nu există Misiune!", variant: "destructive" });
                                    }
                                }}
                                onCreatePlan={(title, subgoalId) => {
                                    createPlanMutation.mutate({
                                        title,
                                        subgoalId,
                                        departmentId: newTaskDepartmentId,
                                    });
                                }}
                                onCreateProgram={(title, planId) => {
                                    createProgramMutation.mutate({
                                        title,
                                        planId,
                                        departmentId: newTaskDepartmentId,
                                    });
                                }}
                                onCreateProject={(title, programId) => {
                                    createProjectMutation.mutate({
                                        title,
                                        programId,
                                        departmentId: newTaskDepartmentId,
                                    });
                                }}
                                onCreateInstruction={(title, projectId) => {
                                    createInstructionMutation.mutate({
                                        title,
                                        projectId,
                                        departmentId: newTaskDepartmentId,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>
                            Renunță
                        </Button>
                        <Button
                            onClick={handleCreateTask}
                            disabled={
                                !newTaskTitle.trim() ||
                                !newTaskDate ||
                                !newTaskDepartmentId ||
                                !newTaskResponsiblePostId ||
                                !hierarchyPath.subgoalId
                            }
                        >
                            Creează sarcină
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Completion Report Dialog */}
            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Raport de Finalizare</DialogTitle>
                        <DialogDescription>
                            {completingTaskTitle} - Trimiteți dovada pentru a finaliza această sarcină
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* What was done */}
                        <div>
                            <label className="text-sm font-medium">Ce ai făcut? *</label>
                            <textarea
                                value={whatWasDone}
                                onChange={(e) => setWhatWasDone(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background min-h-[80px]"
                                placeholder="Descrieți în detaliu ce ați făcut pentru a finaliza această sarcină..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                ⚠️ "Gata", "OK", "Ready" nu sunt acceptabile!
                            </p>
                        </div>

                        {/* When done */}
                        <div>
                            <label className="text-sm font-medium">Când? *</label>
                            <input
                                type="datetime-local"
                                value={whenDone}
                                onChange={(e) => setWhenDone(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                            />
                        </div>

                        {/* Context */}
                        <div>
                            <label className="text-sm font-medium">Unde / Context *</label>
                            <input
                                type="text"
                                value={whereContext}
                                onChange={(e) => setWhereContext(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                placeholder="Locație, numele întâlnirii, sistemul utilizat, etc."
                            />
                        </div>

                        {/* Evidence type */}
                        <div>
                            <label className="text-sm font-medium">Tipul dovezii *</label>
                            <select
                                value={evidenceType}
                                onChange={(e) => setEvidenceType(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                            >
                                <option value="">Selectați tipul...</option>
                                <option value="URL">🔗 URL / Link</option>
                                <option value="SIGNED_NOTE">✍️ Notă semnată</option>
                                <option value="RECEIPT">🧾 Chitanță / Factură</option>
                                <option value="DOCUMENT">📄 Document</option>
                                <option value="IMAGE">🖼️ Imagine / Fotografie</option>
                            </select>
                        </div>

                        {/* Evidence URL (only shown for URL type) */}
                        {evidenceType === "URL" && (
                            <div>
                                <label className="text-sm font-medium">URL Dovadă *</label>
                                <input
                                    type="url"
                                    value={evidenceUrl}
                                    onChange={(e) => setEvidenceUrl(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    placeholder="https://..."
                                />
                            </div>
                        )}

                        {/* Note for file-based evidence */}
                        {["IMAGE", "DOCUMENT", "RECEIPT", "SIGNED_NOTE"].includes(evidenceType) && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm text-amber-700 dark:text-amber-400">
                                📎 Încărcarea fișierelor va fi disponibilă în curând. Deocamdată, vă rugăm să încărcați pe un serviciu și să lipiți URL-ul.
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                            Renunță
                        </Button>
                        <Button
                            onClick={handleCompleteTask}
                            disabled={
                                !whatWasDone.trim() ||
                                !whenDone ||
                                !whereContext.trim() ||
                                !evidenceType ||
                                (evidenceType === "URL" && !evidenceUrl.trim())
                            }
                        >
                            ✓ Finalizează sarcina
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hierarchy Popup Dialog */}
            <Dialog open={!!hierarchyTask} onOpenChange={(open) => !open && setHierarchyTask(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FolderTree className="h-5 w-5 text-primary" />
                            Fluxul complet
                        </DialogTitle>
                        <DialogDescription>
                            Structura completă de la misiune până la sarcina curentă
                        </DialogDescription>
                    </DialogHeader>
                    {hierarchyTask && (
                        <div className="py-6 space-y-4">
                            {/* Mission */}
                            {hierarchyTask.mainGoalTitle && (
                                <div className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-300 dark:border-violet-600/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl">
                                            🎯
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold">
                                                Misiune
                                            </div>
                                            <div className="text-lg font-bold text-violet-700 dark:text-violet-300">
                                                {hierarchyTask.mainGoalTitle}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hierarchy Path */}
                            {hierarchyTask.hierarchyPath && hierarchyTask.hierarchyPath.length > 0 && (
                                <div className="space-y-3 pl-6 border-l-2 border-dashed border-primary/30 ml-6">
                                    {hierarchyTask.hierarchyPath.map((item, idx) => {
                                        const levelInfo = [
                                            { name: "Subobiectiv", icon: "🎯", color: "violet", bg: "from-violet-500/10 to-violet-500/5" },
                                            { name: "Plan", icon: "📋", color: "indigo", bg: "from-indigo-500/10 to-indigo-500/5" },
                                            { name: "Program", icon: "📊", color: "blue", bg: "from-blue-500/10 to-blue-500/5" },
                                            { name: "Proiect", icon: "📁", color: "cyan", bg: "from-cyan-500/10 to-cyan-500/5" },
                                            { name: "Instrucțiune", icon: "📝", color: "teal", bg: "from-teal-500/10 to-teal-500/5" },
                                        ][idx] || { name: "Nivel", icon: "📌", color: "gray", bg: "from-gray-500/10 to-gray-500/5" };

                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "p-4 rounded-xl border",
                                                    `bg-gradient-to-r ${levelInfo.bg} border-${levelInfo.color}-300 dark:border-${levelInfo.color}-600/30`
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0",
                                                        `bg-${levelInfo.color}-500/20`
                                                    )}>
                                                        {levelInfo.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={cn(
                                                            "text-xs uppercase tracking-wider font-semibold",
                                                            `text-${levelInfo.color}-600 dark:text-${levelInfo.color}-400`
                                                        )}>
                                                            {levelInfo.name}
                                                        </div>
                                                        <div className={cn(
                                                            "text-base font-semibold",
                                                            `text-${levelInfo.color}-700 dark:text-${levelInfo.color}-300`
                                                        )}>
                                                            {item.title}
                                                        </div>
                                                        {/* Due date and assignee details */}
                                                        {(item.dueDate || item.assignedUser) && (
                                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                                                {item.assignedUser && (
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="h-3 w-3" />
                                                                        {item.assignedUser.name}
                                                                    </span>
                                                                )}
                                                                {item.dueDate && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {formatDate(item.dueDate)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Current Task */}
                            <div className="ml-12 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-400 dark:border-emerald-600/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-lg">
                                        ✅
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                                                Sarcina curentă
                                            </span>
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                                                {statusLabels[hierarchyTask.status]}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                            {hierarchyTask.title}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Task Details */}
                            <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                                {hierarchyTask.responsiblePost && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Responsabil:</span>
                                        <span className="font-medium">{hierarchyTask.responsiblePost.name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Departament:</span>
                                    <span className="font-medium">{hierarchyTask.department?.name}</span>
                                </div>
                                {hierarchyTask.dueDate && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Termen:</span>
                                        <span className="font-medium">{formatDate(hierarchyTask.dueDate)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setHierarchyTask(null)}>
                            Închide
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Filters */}
            <div className="flex gap-2">
                {["ALL", "TODO", "DOING", "DONE"].map((status) => (
                    <Button
                        key={status}
                        size="sm"
                        variant={
                            (status === "ALL" && !statusFilter) || statusFilter === status
                                ? "default"
                                : "outline"
                        }
                        onClick={() => setStatusFilter(status === "ALL" ? null : status)}
                    >
                        {status === "ALL" ? "Toate" : statusLabels[status]}
                    </Button>
                ))}
            </div>

            {/* Kanban-style columns - show only filtered column when filter is active */}
            <div className={cn(
                "grid gap-6",
                statusFilter ? "md:grid-cols-1 max-w-md" : "md:grid-cols-3"
            )}>
                {(!statusFilter || statusFilter === "TODO") &&
                    renderColumn("De făcut", todoTasks, "bg-slate-400", "TODO")
                }
                {(!statusFilter || statusFilter === "DOING") &&
                    renderColumn("În lucru", doingTasks, "bg-blue-500", "DOING")
                }
                {(!statusFilter || statusFilter === "DONE") &&
                    renderColumn("Finalizate", doneTasks, "bg-green-500", "DONE")
                }
            </div>
        </div>
    );
}
