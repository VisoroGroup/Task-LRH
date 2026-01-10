import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, cn, formatDate, statusLabels, hierarchyLabels } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    Check,
    Clock,
    AlertCircle,
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

export function MyTasks() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
                                onClick={() => {
                                    toast({
                                        title: "Completion Report Required",
                                        description: "Submit evidence to mark as DONE",
                                    });
                                }}
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
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </div>

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

            {/* Kanban-style columns */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* TODO Column */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            To Do
                            <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {todoTasks.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {todoTasks.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                No tasks to do
                            </div>
                        ) : (
                            todoTasks.map((task) => <TaskCard key={task.id} task={task} />)
                        )}
                    </CardContent>
                </Card>

                {/* DOING Column */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            In Progress
                            <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {doingTasks.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {doingTasks.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                No tasks in progress
                            </div>
                        ) : (
                            doingTasks.map((task) => <TaskCard key={task.id} task={task} />)
                        )}
                    </CardContent>
                </Card>

                {/* DONE Column */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Completed
                            <span className="ml-auto text-sm font-normal text-muted-foreground">
                                {doneTasks.length}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {doneTasks.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                No completed tasks
                            </div>
                        ) : (
                            doneTasks.slice(0, 5).map((task) => <TaskCard key={task.id} task={task} />)
                        )}
                        {doneTasks.length > 5 && (
                            <div className="text-center text-sm text-muted-foreground">
                                +{doneTasks.length - 5} more completed
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
