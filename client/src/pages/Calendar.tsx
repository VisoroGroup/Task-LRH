import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, cn, formatDate } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

interface Task {
    id: string;
    title: string;
    status: string;
    hierarchyLevel: string;
    dueDate: string | null;
    department: { name: string };
}

export function Calendar() {
    const { data: tasks, isLoading } = useQuery({
        queryKey: ["calendar-tasks"],
        queryFn: () => apiRequest<Task[]>("/api/tasks"),
    });

    // Filter tasks with due dates
    const tasksWithDates = tasks?.filter(t => t.dueDate && t.status !== "DONE") || [];

    // Group by date
    const groupedByDate: Record<string, Task[]> = {};
    tasksWithDates.forEach(task => {
        const date = new Date(task.dueDate!).toDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(task);
    });

    // Sort dates
    const sortedDates = Object.keys(groupedByDate).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();

    const getDateLabel = (dateStr: string) => {
        if (dateStr === today) return "Today";
        if (dateStr === tomorrow) return "Tomorrow";
        return formatDate(dateStr);
    };

    const isOverdue = (dateStr: string) => {
        return new Date(dateStr) < new Date(today);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Calendar</h2>
                <p className="text-muted-foreground">
                    Tasks with due dates - visualization only, not a planning tool
                </p>
            </div>

            {/* Calendar View */}
            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : tasksWithDates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No upcoming tasks</h3>
                        <p className="text-muted-foreground">
                            Tasks with due dates will appear here
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {sortedDates.map(dateStr => (
                        <Card key={dateStr} className={cn(
                            isOverdue(dateStr) && "border-red-300 dark:border-red-800"
                        )}>
                            <CardHeader className="pb-3">
                                <CardTitle className={cn(
                                    "text-base flex items-center gap-2",
                                    isOverdue(dateStr) && "text-red-600 dark:text-red-400"
                                )}>
                                    <CalendarIcon className="h-4 w-4" />
                                    {getDateLabel(dateStr)}
                                    {isOverdue(dateStr) && (
                                        <span className="text-xs font-normal">(Overdue)</span>
                                    )}
                                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                                        {groupedByDate[dateStr].length} task(s)
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {groupedByDate[dateStr].map(task => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30"
                                        >
                                            <div className="flex items-start gap-3">
                                                <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                                                <div>
                                                    <div className="font-medium">{task.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {task.hierarchyLevel} • {task.department?.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-xs font-medium",
                                                task.status === "TODO" && "status-todo",
                                                task.status === "DOING" && "status-doing"
                                            )}>
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
