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
import {
    Plus,
    Check,
    Clock,
    AlertCircle,
    Calendar,
    Building2,
    User,
    FolderTree,
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

// Flattened hierarchy item for parent selection
interface HierarchyItem {
    id: string;
    title: string;
    level: "SUBGOAL" | "PLAN" | "PROGRAM" | "PROJECT" | "INSTRUCTION";
    departmentId: string;
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

    // Cascading hierarchy selection (full chain visibility)
    const [selectedSubgoalId, setSelectedSubgoalId] = useState("");
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [selectedProgramId, setSelectedProgramId] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedInstructionId, setSelectedInstructionId] = useState("");

    // Inline creation mode and form values for each level
    const [creatingSubgoal, setCreatingSubgoal] = useState(false);
    const [newSubgoalTitle, setNewSubgoalTitle] = useState("");
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [newPlanTitle, setNewPlanTitle] = useState("");
    const [creatingProgram, setCreatingProgram] = useState(false);
    const [newProgramTitle, setNewProgramTitle] = useState("");
    const [creatingProject, setCreatingProject] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");

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

    // Get subgoals for selected department (from the single company-wide main goal)
    const getSubgoals = () => {
        if (!idealScene || idealScene.length === 0 || !newTaskDepartmentId) return [];
        const mainGoal = idealScene[0]; // Single company-wide main goal
        if (!mainGoal?.subgoals) return [];

        // Filter subgoals by their own departmentId
        return mainGoal.subgoals.filter((subgoal: any) =>
            subgoal.departmentId === newTaskDepartmentId
        );
    };

    // Get plans for selected subgoal
    const getPlans = () => {
        if (!selectedSubgoalId) return [];
        const subgoals = getSubgoals();
        const subgoal = subgoals.find((s: any) => s.id === selectedSubgoalId);
        return subgoal?.plans || [];
    };

    // Get programs for selected plan
    const getPrograms = () => {
        if (!selectedPlanId) return [];
        const plans = getPlans();
        const plan = plans.find((p: any) => p.id === selectedPlanId);
        return plan?.programs || [];
    };

    // Get projects for selected program
    const getProjects = () => {
        if (!selectedProgramId) return [];
        const programs = getPrograms();
        const program = programs.find((p: any) => p.id === selectedProgramId);
        return program?.projects || [];
    };

    // Get instructions for selected project
    const getInstructions = () => {
        if (!selectedProjectId) return [];
        const projects = getProjects();
        const project = projects.find((p: any) => p.id === selectedProjectId);
        return project?.instructions || [];
    };

    // Determine the lowest selected level and its ID for task creation
    const getParentInfo = () => {
        if (selectedInstructionId) return { level: "INSTRUCTION", parentId: selectedInstructionId };
        if (selectedProjectId) return { level: "PROJECT", parentId: selectedProjectId };
        if (selectedProgramId) return { level: "PROGRAM", parentId: selectedProgramId };
        if (selectedPlanId) return { level: "PLAN", parentId: selectedPlanId };
        if (selectedSubgoalId) return { level: "SUBGOAL", parentId: selectedSubgoalId };
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

    // Mutations for creating hierarchy items inline
    const createSubgoalMutation = useMutation({
        mutationFn: async (data: { title: string; mainGoalId: string; departmentId: string }) => {
            return apiRequest("/api/ideal-scene/subgoals", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            setCreatingSubgoal(false);
            setNewSubgoalTitle("");
            setSelectedSubgoalId(result.id);
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
            setCreatingPlan(false);
            setNewPlanTitle("");
            setSelectedPlanId(result.id);
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
            setCreatingProgram(false);
            setNewProgramTitle("");
            setSelectedProgramId(result.id);
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
            setCreatingProject(false);
            setNewProjectTitle("");
            setSelectedProjectId(result.id);
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
            // Reset cascading hierarchy
            setSelectedSubgoalId("");
            setSelectedPlanId("");
            setSelectedProgramId("");
            setSelectedProjectId("");
            setSelectedInstructionId("");
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

                <h4 className="font-medium mb-2">{task.title}</h4>

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
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>
                            Add a new task with all required information
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
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
                                    // Reset all cascading selections
                                    setSelectedSubgoalId("");
                                    setSelectedPlanId("");
                                    setSelectedProgramId("");
                                    setSelectedProjectId("");
                                    setSelectedInstructionId("");
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

                        {/* ═══════════════════════════════════════════════════════════════ */}
                        {/* CASCADING HIERARCHY CHAIN WITH INLINE CREATION                   */}
                        {/* ═══════════════════════════════════════════════════════════════ */}
                        <div className="border-t pt-4 mt-2">
                            <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <FolderTree className="h-4 w-4" />
                                Hierarchy Chain (Válaszd ki a szintet ahol a task tartozik)
                            </div>

                            {/* 1. Alcél (Subgoal) */}
                            {newTaskDepartmentId && (
                                <div className="mb-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">1. Alcél (Subgoal) *</label>
                                        {!creatingSubgoal && (
                                            <button
                                                type="button"
                                                onClick={() => setCreatingSubgoal(true)}
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                + Új Alcél
                                            </button>
                                        )}
                                    </div>

                                    {creatingSubgoal ? (
                                        <div className="mt-2 p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                                            <input
                                                type="text"
                                                value={newSubgoalTitle}
                                                onChange={(e) => setNewSubgoalTitle(e.target.value)}
                                                className="w-full px-2 py-1 border rounded text-sm bg-background"
                                                placeholder="Alcél neve..."
                                                autoFocus
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const mainGoal = getMainGoal();
                                                        if (!mainGoal) {
                                                            toast({ title: "Hiba: Nincs Főcél beállítva. Állítsd be a Settings oldalon!", variant: "destructive" });
                                                            return;
                                                        }
                                                        if (newSubgoalTitle.trim()) {
                                                            createSubgoalMutation.mutate({
                                                                title: newSubgoalTitle.trim(),
                                                                mainGoalId: mainGoal.id,
                                                                departmentId: newTaskDepartmentId,
                                                            });
                                                        }
                                                    }}
                                                    disabled={!newSubgoalTitle.trim() || createSubgoalMutation.isPending}
                                                >
                                                    Létrehozás
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setCreatingSubgoal(false); setNewSubgoalTitle(""); }}>
                                                    Mégse
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedSubgoalId}
                                            onChange={(e) => {
                                                setSelectedSubgoalId(e.target.value);
                                                setSelectedPlanId("");
                                                setSelectedProgramId("");
                                                setSelectedProjectId("");
                                                setSelectedInstructionId("");
                                            }}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                        >
                                            <option value="">Válassz Alcélt...</option>
                                            {getSubgoals().map((subgoal: any) => (
                                                <option key={subgoal.id} value={subgoal.id}>{subgoal.title}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* 2. Terv (Plan) */}
                            {selectedSubgoalId && (
                                <div className="mb-3 ml-4 border-l-2 border-blue-200 pl-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">2. Terv (Plan)</label>
                                        {!creatingPlan && (
                                            <button
                                                type="button"
                                                onClick={() => setCreatingPlan(true)}
                                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                + Új Terv
                                            </button>
                                        )}
                                    </div>

                                    {creatingPlan ? (
                                        <div className="mt-2 p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                                            <input
                                                type="text"
                                                value={newPlanTitle}
                                                onChange={(e) => setNewPlanTitle(e.target.value)}
                                                className="w-full px-2 py-1 border rounded text-sm bg-background"
                                                placeholder="Terv neve..."
                                                autoFocus
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (newPlanTitle.trim()) {
                                                            createPlanMutation.mutate({
                                                                title: newPlanTitle.trim(),
                                                                subgoalId: selectedSubgoalId,
                                                                departmentId: newTaskDepartmentId,
                                                            });
                                                        }
                                                    }}
                                                    disabled={!newPlanTitle.trim() || createPlanMutation.isPending}
                                                >
                                                    Létrehozás
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setCreatingPlan(false); setNewPlanTitle(""); }}>
                                                    Mégse
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedPlanId}
                                            onChange={(e) => {
                                                setSelectedPlanId(e.target.value);
                                                setSelectedProgramId("");
                                                setSelectedProjectId("");
                                                setSelectedInstructionId("");
                                            }}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                        >
                                            <option value="">Nincs terv kiválasztva</option>
                                            {getPlans().map((plan: any) => (
                                                <option key={plan.id} value={plan.id}>{plan.title}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* 3. Program */}
                            {selectedPlanId && (
                                <div className="mb-3 ml-8 border-l-2 border-green-200 pl-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">3. Program</label>
                                        {!creatingProgram && (
                                            <button
                                                type="button"
                                                onClick={() => setCreatingProgram(true)}
                                                className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                                            >
                                                + Új Program
                                            </button>
                                        )}
                                    </div>

                                    {creatingProgram ? (
                                        <div className="mt-2 p-2 border rounded-md bg-green-50 dark:bg-green-900/20">
                                            <input
                                                type="text"
                                                value={newProgramTitle}
                                                onChange={(e) => setNewProgramTitle(e.target.value)}
                                                className="w-full px-2 py-1 border rounded text-sm bg-background"
                                                placeholder="Program neve..."
                                                autoFocus
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (newProgramTitle.trim()) {
                                                            createProgramMutation.mutate({
                                                                title: newProgramTitle.trim(),
                                                                planId: selectedPlanId,
                                                                departmentId: newTaskDepartmentId,
                                                            });
                                                        }
                                                    }}
                                                    disabled={!newProgramTitle.trim() || createProgramMutation.isPending}
                                                >
                                                    Létrehozás
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setCreatingProgram(false); setNewProgramTitle(""); }}>
                                                    Mégse
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedProgramId}
                                            onChange={(e) => {
                                                setSelectedProgramId(e.target.value);
                                                setSelectedProjectId("");
                                                setSelectedInstructionId("");
                                            }}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                        >
                                            <option value="">Nincs program kiválasztva</option>
                                            {getPrograms().map((program: any) => (
                                                <option key={program.id} value={program.id}>{program.title}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* 4. Projekt (Project) */}
                            {selectedProgramId && (
                                <div className="mb-3 ml-12 border-l-2 border-yellow-200 pl-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">4. Projekt</label>
                                        {!creatingProject && (
                                            <button
                                                type="button"
                                                onClick={() => setCreatingProject(true)}
                                                className="text-xs text-yellow-600 hover:text-yellow-800 flex items-center gap-1"
                                            >
                                                + Új Projekt
                                            </button>
                                        )}
                                    </div>

                                    {creatingProject ? (
                                        <div className="mt-2 p-2 border rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                                            <input
                                                type="text"
                                                value={newProjectTitle}
                                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                                className="w-full px-2 py-1 border rounded text-sm bg-background"
                                                placeholder="Projekt neve..."
                                                autoFocus
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (newProjectTitle.trim()) {
                                                            createProjectMutation.mutate({
                                                                title: newProjectTitle.trim(),
                                                                programId: selectedProgramId,
                                                                departmentId: newTaskDepartmentId,
                                                            });
                                                        }
                                                    }}
                                                    disabled={!newProjectTitle.trim() || createProjectMutation.isPending}
                                                >
                                                    Létrehozás
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setCreatingProject(false); setNewProjectTitle(""); }}>
                                                    Mégse
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedProjectId}
                                            onChange={(e) => {
                                                setSelectedProjectId(e.target.value);
                                                setSelectedInstructionId("");
                                            }}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                        >
                                            <option value="">Nincs projekt kiválasztva</option>
                                            {getProjects().map((project: any) => (
                                                <option key={project.id} value={project.id}>{project.title}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Current Selection Summary */}
                            {selectedSubgoalId && (
                                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                    <strong>Task szintje:</strong> {getParentInfo().level || "Nincs kiválasztva"}
                                </div>
                            )}
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
                                !selectedSubgoalId
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
