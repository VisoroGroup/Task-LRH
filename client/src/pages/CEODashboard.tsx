import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, cn } from "@/lib/utils";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Users,
    X,
} from "lucide-react";

interface DashboardSummary {
    totalActive: number;
    stalledTasks: number;
    overdueTasks: number;
    completedCycles: number;
    avgTasksPerPost: number;
}

interface GridUser {
    userId: string;
    userName: string;
    userRole: string;
    todoCount: number;
    doingCount: number;
    doneCount: number;
    overdueCount: number;
    stalledCount: number;
    flowStatus: "normal" | "overload" | "stalled";
}

interface Task {
    id: string;
    title: string;
    status: string;
    hierarchyLevel: string;
    dueDate: string | null;
    department: { name: string };
}

export function CEODashboard() {
    const [selectedUser, setSelectedUser] = useState<{ userId: string; userName: string; status?: string } | null>(null);

    // Fetch summary indicators
    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ["dashboard-summary"],
        queryFn: () => apiRequest<DashboardSummary>("/api/dashboard/summary"),
    });

    // Fetch executive grid
    const { data: grid, isLoading: gridLoading } = useQuery({
        queryKey: ["dashboard-grid"],
        queryFn: () => apiRequest<GridUser[]>("/api/dashboard/grid"),
    });

    // Fetch user tasks when side panel is open
    const { data: userTasks } = useQuery({
        queryKey: ["user-tasks", selectedUser?.userId, selectedUser?.status],
        queryFn: () => {
            const url = selectedUser?.status
                ? `/api/dashboard/user-tasks/${selectedUser.userId}?status=${selectedUser.status}`
                : `/api/dashboard/user-tasks/${selectedUser?.userId}`;
            return apiRequest<Task[]>(url);
        },
        enabled: !!selectedUser,
    });

    const handleCellClick = (userId: string, userName: string, status?: string) => {
        setSelectedUser({ userId, userName, status });
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="kpi-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryLoading ? "..." : summary?.totalActive || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Total workload</p>
                    </CardContent>
                </Card>

                <Card className="kpi-card border-red-200 dark:border-red-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stalled</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {summaryLoading ? "..." : summary?.stalledTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">No movement in 3+ days</p>
                    </CardContent>
                </Card>

                <Card className="kpi-card border-yellow-200 dark:border-yellow-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {summaryLoading ? "..." : summary?.overdueTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Past due date</p>
                    </CardContent>
                </Card>

                <Card className="kpi-card border-green-200 dark:border-green-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {summaryLoading ? "..." : summary?.completedCycles || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Cycles with reports</p>
                    </CardContent>
                </Card>

                <Card className="kpi-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg per Post</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryLoading ? "..." : summary?.avgTasksPerPost || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Tasks per person</p>
                    </CardContent>
                </Card>
            </div>

            {/* Executive Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Post Holder Status Grid
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {gridLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : grid && grid.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium">Post Holder</th>
                                        <th className="text-center py-3 px-4 font-medium">TODO</th>
                                        <th className="text-center py-3 px-4 font-medium">DOING</th>
                                        <th className="text-center py-3 px-4 font-medium">DONE</th>
                                        <th className="text-center py-3 px-4 font-medium">Overdue</th>
                                        <th className="text-center py-3 px-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grid.map((user) => (
                                        <tr key={user.userId} className="border-b hover:bg-accent/30">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-xs font-medium text-primary">
                                                            {user.userName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{user.userName}</div>
                                                        <div className="text-xs text-muted-foreground">{user.userRole}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <button
                                                    onClick={() => handleCellClick(user.userId, user.userName, "TODO")}
                                                    className="dashboard-cell inline-block min-w-[3rem] status-todo"
                                                >
                                                    {user.todoCount}
                                                </button>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <button
                                                    onClick={() => handleCellClick(user.userId, user.userName, "DOING")}
                                                    className="dashboard-cell inline-block min-w-[3rem] status-doing"
                                                >
                                                    {user.doingCount}
                                                </button>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <button
                                                    onClick={() => handleCellClick(user.userId, user.userName, "DONE")}
                                                    className="dashboard-cell inline-block min-w-[3rem] status-done"
                                                >
                                                    {user.doneCount}
                                                </button>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <button
                                                    onClick={() => handleCellClick(user.userId, user.userName)}
                                                    className={cn(
                                                        "dashboard-cell inline-block min-w-[3rem]",
                                                        user.overdueCount > 0 ? "flow-stalled" : ""
                                                    )}
                                                >
                                                    {user.overdueCount}
                                                </button>
                                            </td>
                                            <td className="text-center py-3 px-4">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                                                        user.flowStatus === "normal" && "flow-normal",
                                                        user.flowStatus === "overload" && "flow-overload",
                                                        user.flowStatus === "stalled" && "flow-stalled"
                                                    )}
                                                >
                                                    {user.flowStatus === "normal" && "🟢 Normal"}
                                                    {user.flowStatus === "overload" && "🟡 Overload"}
                                                    {user.flowStatus === "stalled" && "🔴 Stalled"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No post holders found. Create users to see the executive grid.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Side Panel for Task Details */}
            {selectedUser && (
                <div className="side-panel w-96">
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div>
                                <h3 className="font-semibold">{selectedUser.userName}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selectedUser.status ? `${selectedUser.status} Tasks` : "All Tasks"}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {userTasks && userTasks.length > 0 ? (
                                userTasks.map((task) => (
                                    <div key={task.id} className="p-3 border rounded-lg hover:bg-accent/30">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="text-xs text-muted-foreground mb-1">
                                                    {task.hierarchyLevel}: {task.department?.name}
                                                </div>
                                                <div className="font-medium">{task.title}</div>
                                                {task.dueDate && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    task.status === "TODO" && "status-todo",
                                                    task.status === "DOING" && "status-doing",
                                                    task.status === "DONE" && "status-done"
                                                )}
                                            >
                                                {task.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No tasks found
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
