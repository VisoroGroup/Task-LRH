import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, cn, formatDate } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { Calendar as CalendarIcon, Clock, Target, FileText, Layers, FolderKanban, ListChecks } from "lucide-react";

interface Task {
    id: string;
    title: string;
    status: string;
    hierarchyLevel: string;
    dueDate: string | null;
    department: { name: string };
}

interface HierarchyItem {
    id: string;
    title: string;
    dueDate?: string;
}

interface IdealScene {
    id: string;
    description: string;
    subgoals?: (HierarchyItem & {
        plans?: (HierarchyItem & {
            programs?: (HierarchyItem & {
                projects?: (HierarchyItem & {
                    instructions?: HierarchyItem[];
                })[];
            })[];
        })[];
    })[];
}

interface CalendarItem {
    id: string;
    title: string;
    dueDate: string;
    type: "task" | "subgoal" | "plan" | "program" | "project" | "instruction";
    status?: string;
    department?: string;
}

export function Calendar() {
    const { user } = useAuth();

    // Only fetch tasks assigned to current user
    const { data: tasks, isLoading: tasksLoading } = useQuery({
        queryKey: ["calendar-tasks", user?.id],
        queryFn: () => {
            if (!user?.id) return [];
            return apiRequest<Task[]>(`/api/tasks?responsiblePostId=${user.id}`);
        },
        enabled: !!user?.id,
    });

    const { data: idealScene, isLoading: hierarchyLoading } = useQuery({
        queryKey: ["ideal-scene"],
        queryFn: () => apiRequest<IdealScene[]>("/api/ideal-scene"),
    });

    const isLoading = tasksLoading || hierarchyLoading;

    // Collect all hierarchy items with due dates
    const hierarchyItems: CalendarItem[] = [];

    idealScene?.forEach(mainGoal => {
        mainGoal.subgoals?.forEach(subgoal => {
            if (subgoal.dueDate) {
                hierarchyItems.push({
                    id: subgoal.id,
                    title: subgoal.title,
                    dueDate: subgoal.dueDate,
                    type: "subgoal",
                });
            }
            subgoal.plans?.forEach(plan => {
                if (plan.dueDate) {
                    hierarchyItems.push({
                        id: plan.id,
                        title: plan.title,
                        dueDate: plan.dueDate,
                        type: "plan",
                    });
                }
                plan.programs?.forEach(program => {
                    if (program.dueDate) {
                        hierarchyItems.push({
                            id: program.id,
                            title: program.title,
                            dueDate: program.dueDate,
                            type: "program",
                        });
                    }
                    program.projects?.forEach(project => {
                        if (project.dueDate) {
                            hierarchyItems.push({
                                id: project.id,
                                title: project.title,
                                dueDate: project.dueDate,
                                type: "project",
                            });
                        }
                        project.instructions?.forEach(instruction => {
                            if (instruction.dueDate) {
                                hierarchyItems.push({
                                    id: instruction.id,
                                    title: instruction.title,
                                    dueDate: instruction.dueDate,
                                    type: "instruction",
                                });
                            }
                        });
                    });
                });
            });
        });
    });

    // Convert tasks to CalendarItems
    const taskItems: CalendarItem[] = (tasks || [])
        .filter(t => t.dueDate && t.status !== "DONE")
        .map(t => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate!,
            type: "task" as const,
            status: t.status,
            department: t.department?.name,
        }));

    // Merge all items
    const allItems = [...taskItems, ...hierarchyItems];

    // Group by date
    const groupedByDate: Record<string, CalendarItem[]> = {};
    allItems.forEach(item => {
        const date = new Date(item.dueDate).toDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(item);
    });

    // Sort dates
    const sortedDates = Object.keys(groupedByDate).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();

    const getDateLabel = (dateStr: string) => {
        if (dateStr === today) return "Azi";
        if (dateStr === tomorrow) return "Mâine";
        return formatDate(dateStr);
    };

    const isOverdue = (dateStr: string) => {
        return new Date(dateStr) < new Date(today);
    };

    const getTypeIcon = (type: CalendarItem["type"]) => {
        switch (type) {
            case "task": return <ListChecks className="h-4 w-4" />;
            case "subgoal": return <Target className="h-4 w-4" />;
            case "plan": return <FileText className="h-4 w-4" />;
            case "program": return <Layers className="h-4 w-4" />;
            case "project": return <FolderKanban className="h-4 w-4" />;
            case "instruction": return <FileText className="h-4 w-4" />;
        }
    };

    const getTypeBadge = (type: CalendarItem["type"]) => {
        const styles: Record<string, string> = {
            task: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
            subgoal: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
            plan: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
            program: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
            project: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
            instruction: "bg-teal-500/20 text-teal-700 dark:text-teal-300",
        };
        const labels: Record<string, string> = {
            task: "Sarcină",
            subgoal: "Subobiectiv",
            plan: "Plan",
            program: "Program",
            project: "Proiect",
            instruction: "Instrucțiune",
        };
        return (
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", styles[type])}>
                {labels[type]}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Calendar</h2>
                <p className="text-muted-foreground">
                    Termene pentru sarcini și elemente de ierarhie
                </p>
            </div>

            {/* Calendar View */}
            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>
            ) : allItems.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Niciun termen</h3>
                        <p className="text-muted-foreground">
                            Sarcinile și elementele cu termene vor apărea aici
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
                                        <span className="text-xs font-normal">(Întârziat)</span>
                                    )}
                                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                                        {groupedByDate[dateStr].length} element(e)
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {groupedByDate[dateStr].map(item => (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="mt-1 text-muted-foreground">
                                                    {getTypeIcon(item.type)}
                                                </span>
                                                <div>
                                                    <div className="font-medium">{item.title}</div>
                                                    {item.department && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.department}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getTypeBadge(item.type)}
                                                {item.status && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-xs font-medium",
                                                        item.status === "TODO" && "status-todo",
                                                        item.status === "DOING" && "status-doing"
                                                    )}>
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>
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

