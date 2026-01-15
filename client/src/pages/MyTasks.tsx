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
    hierarchyPath?: string[];
}

interface Department {
    id: string;
    name: string;
}

interface UserType {
    id: string;
    name: string;
    email: string;
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
    const [newTaskResponsibleUserId, setNewTaskResponsibleUserId] = useState("");

    // Hierarchy selection state (unified for tree selector)
    const [hierarchyPath, setHierarchyPath] = useState({
        subgoalId: "",
        planId: "",
        programId: "",
        projectId: "",
    });

    // Completion report dialog state
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState<string>("");
    const [completingTaskTitle, setCompletingTaskTitle] = useState<string>("");
    const [whatWasDone, setWhatWasDone] = useState("");
    const [whenDone, setWhenDone] = useState("");
    const [whereContext, setWhereContext] = useState("");
    const [evidenceType, setEvidenceType] = useState<string>("");
    const [evidenceUrl, setEvidenceUrl] = useState("");

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

    // For now, we'll show all tasks (in production, filter by current user)
    const { data: tasks, isLoading } = useQuery({
        queryKey: ["my-tasks", statusFilter],
        queryFn: () => {
            const url = statusFilter
                ? `/api/tasks?status=${statusFilter}`
                : "/api/tasks";
            return apiRequest<Task[]>(url);
        },
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

    const openCompleteDialog = (task: Task) => {
        setCompletingTaskId(task.id);
        setCompletingTaskTitle(task.title);
        setWhenDone(new Date().toISOString().slice(0, 16)); // Default to now
        setIsCompleteDialogOpen(true);
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
            setHierarchyPath(prev => ({ ...prev, subgoalId: result.id, planId: "", programId: "", projectId: "" }));
            toast({ title: "Alcél létrehozva!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Hiba történt", description: error.message, variant: "destructive" });
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
            setHierarchyPath(prev => ({ ...prev, planId: result.id, programId: "", projectId: "" }));
            toast({ title: "Terv létrehozva!", variant: "success" as any });
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
            setHierarchyPath(prev => ({ ...prev, programId: result.id, projectId: "" }));
            toast({ title: "Program létrehozva!", variant: "success" as any });
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
            setHierarchyPath(prev => ({ ...prev, projectId: result.id }));
            toast({ title: "Projekt létrehozva!", variant: "success" as any });
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
            responsibleUserId: string;
            hierarchyLevel: string;
            parentItemId: string;
            creatorId: string;
        }) => {
            return apiRequest("/api/tasks", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
            toast({ title: "Task created", variant: "success" as any });
            setIsNewTaskOpen(false);
            // Reset all fields
            setNewTaskTitle("");
            setNewTaskDate("");
            setNewTaskTime("");
            setNewTaskDepartmentId("");
            setNewTaskResponsibleUserId("");
            // Reset hierarchy path
            setHierarchyPath({ subgoalId: "", planId: "", programId: "", projectId: "" });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to create task",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleCreateTask = () => {
        // Validate all required fields
        if (!newTaskTitle.trim()) {
            toast({ title: "Title is required", variant: "destructive" });
            return;
        }
        if (!newTaskDate) {
            toast({ title: "Due date is required", variant: "destructive" });
            return;
        }
        if (!newTaskDepartmentId) {
            toast({ title: "Department is required", variant: "destructive" });
            return;
        }
        if (!newTaskResponsibleUserId) {
            toast({ title: "Responsible person is required", variant: "destructive" });
            return;
        }

        const parentInfo = getParentInfo();
        if (!parentInfo.parentId) {
            toast({ title: "Please select at least an Alcél (Subgoal)", variant: "destructive" });
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
            responsibleUserId: newTaskResponsibleUserId,
            hierarchyLevel: parentInfo.level,
            parentItemId: parentInfo.parentId,
            creatorId,
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
                "p-4 border rounded-lg hover:shadow-md transition-shadow",
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
                            Overdue
                        </span>
                    )}
                </div>

                <h4 className="font-medium mb-1">{task.title}</h4>

                {/* Hierarchy Breadcrumb */}
                {task.hierarchyPath && task.hierarchyPath.length > 0 && (
                    <div className="flex items-center flex-wrap gap-0.5 text-xs text-muted-foreground mb-2">
                        {task.hierarchyPath.map((item, idx) => (
                            <span key={idx} className="flex items-center">
                                <span className="truncate max-w-[80px]" title={item}>{item}</span>
                                {idx < task.hierarchyPath!.length - 1 && (
                                    <ChevronRight className="h-3 w-3 mx-0.5 flex-shrink-0" />
                                )}
                            </span>
                        ))}
                    </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                    <div>Department: {task.department?.name}</div>
                    {task.dueDate && (
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due: {formatDate(task.dueDate)}
                        </div>
                    )}
                </div>

                {/* Status change buttons */}
                {task.status !== "DONE" && (
                    <div className="flex gap-2 mt-3">
                        {task.status === "TODO" && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: "DOING" })}
                            >
                                Start Working
                            </Button>
                        )}
                        {task.status === "DOING" && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => openCompleteDialog(task)}
                            >
                                <Check className="h-3 w-3 mr-1" />
                                Complete
                            </Button>
                        )}
                    </div>
                )}

                {task.status === "DONE" && task.completionReport && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                        <div className="font-medium text-green-700 dark:text-green-400">
                            ✓ Completed with report
                        </div>
                    </div>
                )}
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
                        No {title.toLowerCase()} tasks
                    </div>
                ) : (
                    statusKey === "DONE"
                        ? tasks.slice(0, 5).map((task) => <TaskCard key={task.id} task={task} />)
                        : tasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
                {statusKey === "DONE" && tasks.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground">
                        +{tasks.length - 5} more completed
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">My Tasks</h2>
                    <p className="text-muted-foreground">Your assigned action steps</p>
                </div>
                <Button onClick={() => setIsNewTaskOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </div>

            {/* New Task Dialog */}
            <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogContent className="max-w-4xl w-[80vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Add a new task with all required information
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left column - Basic Info */}
                        <div className="space-y-4">
                            {/* Task Title */}
                            <div>
                                <label className="text-sm font-medium">Task Title *</label>
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    placeholder="What needs to be done?"
                                />
                            </div>

                            {/* Department Selection */}
                            <div>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Department *
                                </label>
                                <select
                                    value={newTaskDepartmentId}
                                    onChange={(e) => {
                                        setNewTaskDepartmentId(e.target.value);
                                        // Reset hierarchy selection
                                        setHierarchyPath({ subgoalId: "", planId: "", programId: "", projectId: "" });
                                    }}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                >
                                    <option value="">Select department...</option>
                                    {departments?.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Responsible Person */}
                            <div>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Responsible Person *
                                </label>
                                <select
                                    value={newTaskResponsibleUserId}
                                    onChange={(e) => setNewTaskResponsibleUserId(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                >
                                    <option value="">Select person...</option>
                                    {users?.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Due Date *
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
                                <label className="text-sm font-medium">Time (optional)</label>
                                <input
                                    type="time"
                                    value={newTaskTime}
                                    onChange={(e) => setNewTaskTime(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                />
                            </div>
                        </div>

                        {/* Right column - Hierarchy Tree */}
                        <div className="border-l pl-6">
                            <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <FolderTree className="h-4 w-4" />
                                Hierarchy Chain *
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
                                        toast({ title: "Hiba: Nincs Főcél beállítva!", variant: "destructive" });
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
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateTask}
                            disabled={
                                !newTaskTitle.trim() ||
                                !newTaskDate ||
                                !newTaskDepartmentId ||
                                !newTaskResponsibleUserId ||
                                !hierarchyPath.subgoalId
                            }
                        >
                            Create Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Completion Report Dialog */}
            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Teljesítés Jelentés</DialogTitle>
                        <DialogDescription>
                            {completingTaskTitle} - Submit evidence to complete this task
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* What was done */}
                        <div>
                            <label className="text-sm font-medium">Mit csináltál? (What was done) *</label>
                            <textarea
                                value={whatWasDone}
                                onChange={(e) => setWhatWasDone(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background min-h-[80px]"
                                placeholder="Describe in detail what you did to complete this task..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                ⚠️ "Kész", "OK", "Ready" nem elfogadható!
                            </p>
                        </div>

                        {/* When done */}
                        <div>
                            <label className="text-sm font-medium">Mikor? (When) *</label>
                            <input
                                type="datetime-local"
                                value={whenDone}
                                onChange={(e) => setWhenDone(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                            />
                        </div>

                        {/* Context */}
                        <div>
                            <label className="text-sm font-medium">Hol / Kontextus (Where/Context) *</label>
                            <input
                                type="text"
                                value={whereContext}
                                onChange={(e) => setWhereContext(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                placeholder="Location, meeting name, system used, etc."
                            />
                        </div>

                        {/* Evidence type */}
                        <div>
                            <label className="text-sm font-medium">Bizonyíték típusa (Evidence Type) *</label>
                            <select
                                value={evidenceType}
                                onChange={(e) => setEvidenceType(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                            >
                                <option value="">Select type...</option>
                                <option value="URL">🔗 URL / Link</option>
                                <option value="SIGNED_NOTE">✍️ Aláírt feljegyzés</option>
                                <option value="RECEIPT">🧾 Nyugta / Számla</option>
                                <option value="DOCUMENT">📄 Dokumentum</option>
                                <option value="IMAGE">🖼️ Kép / Fénykép</option>
                            </select>
                        </div>

                        {/* Evidence URL (only shown for URL type) */}
                        {evidenceType === "URL" && (
                            <div>
                                <label className="text-sm font-medium">Evidence URL *</label>
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
                                📎 File upload coming soon. For now, please upload to a service and paste the URL.
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                            Cancel
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
                            ✓ Complete Task
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
                        {status === "ALL" ? "All" : statusLabels[status]}
                    </Button>
                ))}
            </div>

            {/* Kanban-style columns - show only filtered column when filter is active */}
            <div className={cn(
                "grid gap-6",
                statusFilter ? "md:grid-cols-1 max-w-md" : "md:grid-cols-3"
            )}>
                {(!statusFilter || statusFilter === "TODO") &&
                    renderColumn("To Do", todoTasks, "bg-slate-400", "TODO")
                }
                {(!statusFilter || statusFilter === "DOING") &&
                    renderColumn("In Progress", doingTasks, "bg-blue-500", "DOING")
                }
                {(!statusFilter || statusFilter === "DONE") &&
                    renderColumn("Completed", doneTasks, "bg-green-500", "DONE")
                }
            </div>
        </div>
    );
}
