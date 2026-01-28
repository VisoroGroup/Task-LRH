import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import {
    RefreshCw,
    Plus,
    Check,
    Clock,
    Building2,
    User,
    Calendar,
    Trash2,
} from "lucide-react";

interface Department {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
}

interface RecurringTask {
    id: string;
    title: string;
    description?: string | null;
    departmentId: string;
    assignedUserId: string;
    recurrenceType: "DAILY" | "WEEKLY" | "IRREGULAR";
    recurrenceDays?: number[] | null;
    isActive: boolean;
    createdAt: string;
    department: Department;
    assignedUser: User;
    createdBy: User;
    isCompletedForPeriod: boolean;
    periodStart: string;
}

const recurrenceLabels = {
    DAILY: "Zilnic",
    WEEKLY: "Săptămânal",
    IRREGULAR: "Neregulat",
};

const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
const dayFullLabels = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

export function RecurringTasks() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        departmentId: "",
        assignedUserId: "",
        recurrenceType: "WEEKLY" as "DAILY" | "WEEKLY" | "IRREGULAR",
        recurrenceDays: [5] as number[], // Default Friday
    });

    const isManager = user?.role === "CEO" || user?.role === "EXECUTIVE";

    // Fetch recurring tasks
    const { data: tasks = [], isLoading } = useQuery<RecurringTask[]>({
        queryKey: ["recurring-tasks"],
        queryFn: () => apiRequest("/api/recurring-tasks"),
    });

    // Fetch departments
    const { data: departments = [] } = useQuery<Department[]>({
        queryKey: ["departments"],
        queryFn: () => apiRequest("/api/departments"),
    });

    // Fetch users
    const { data: users = [] } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: () => apiRequest("/api/users"),
    });

    // Create task mutation
    const createMutation = useMutation({
        mutationFn: async (data: typeof newTask) => {
            return apiRequest("/api/recurring-tasks", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
            setIsNewTaskOpen(false);
            setNewTask({
                title: "",
                description: "",
                departmentId: "",
                assignedUserId: "",
                recurrenceType: "WEEKLY",
                recurrenceDays: [5],
            });
            toast({ title: "Sarcină creată cu succes!" });
        },
        onError: (error: Error) => {
            toast({ title: "Eroare", description: error.message, variant: "destructive" });
        },
    });

    // Complete task mutation
    const completeMutation = useMutation({
        mutationFn: async (taskId: string) => {
            return apiRequest(`/api/recurring-tasks/${taskId}/complete`, {
                method: "POST",
                body: JSON.stringify({}),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
            toast({ title: "✅ Sarcină finalizată!", description: "Notificarea a fost trimisă." });
        },
        onError: (error: Error) => {
            toast({ title: "Eroare", description: error.message, variant: "destructive" });
        },
    });

    // Delete task mutation
    const deleteMutation = useMutation({
        mutationFn: async (taskId: string) => {
            return apiRequest(`/api/recurring-tasks/${taskId}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
            toast({ title: "Sarcină ștearsă" });
        },
    });

    const handleCreate = () => {
        if (!newTask.title || !newTask.departmentId || !newTask.assignedUserId) {
            toast({ title: "Completează toate câmpurile obligatorii", variant: "destructive" });
            return;
        }
        createMutation.mutate(newTask);
    };

    const toggleDay = (day: number) => {
        const days = newTask.recurrenceDays || [];
        if (days.includes(day)) {
            setNewTask({ ...newTask, recurrenceDays: days.filter(d => d !== day) });
        } else {
            setNewTask({ ...newTask, recurrenceDays: [...days, day].sort() });
        }
    };

    // Group tasks by status
    const pendingTasks = tasks.filter(t => !t.isCompletedForPeriod);
    const completedTasks = tasks.filter(t => t.isCompletedForPeriod);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <RefreshCw className="h-8 w-8 text-primary" />
                        Sarcini recurente
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Teendők care se repetă regulat
                    </p>
                </div>

                {isManager && (
                    <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Adaugă sarcină
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Sarcină recurentă nouă</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Titlu *</label>
                                    <Input
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        placeholder="ex: Trimite raportul săptămânal"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Descriere</label>
                                    <Textarea
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        placeholder="Detalii suplimentare..."
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Departament *</label>
                                        <Select
                                            value={newTask.departmentId}
                                            onValueChange={(v) => setNewTask({ ...newTask, departmentId: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selectează..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((d) => (
                                                    <SelectItem key={d.id} value={d.id}>
                                                        {d.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Responsabil *</label>
                                        <Select
                                            value={newTask.assignedUserId}
                                            onValueChange={(v) => setNewTask({ ...newTask, assignedUserId: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selectează..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((u) => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Frecvență</label>
                                    <Select
                                        value={newTask.recurrenceType}
                                        onValueChange={(v: any) => setNewTask({ ...newTask, recurrenceType: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DAILY">Zilnic</SelectItem>
                                            <SelectItem value="WEEKLY">Săptămânal</SelectItem>
                                            <SelectItem value="IRREGULAR">Neregulat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newTask.recurrenceType === "WEEKLY" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Zile</label>
                                        <div className="flex gap-2">
                                            {dayLabels.map((label, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => toggleDay(idx)}
                                                    className={cn(
                                                        "w-9 h-9 rounded-full text-sm font-medium transition-colors",
                                                        newTask.recurrenceDays?.includes(idx)
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted hover:bg-muted/80"
                                                    )}
                                                    title={dayFullLabels[idx]}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending}
                                    className="w-full"
                                >
                                    {createMutation.isPending ? "Se creează..." : "Creează sarcina"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-amber-500/10">
                                <Clock className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                                <p className="text-sm text-muted-foreground">În așteptare</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-green-500/10">
                                <Check className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{completedTasks.length}</p>
                                <p className="text-sm text-muted-foreground">Finalizate azi</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <RefreshCw className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{tasks.length}</p>
                                <p className="text-sm text-muted-foreground">Total sarcini</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Tasks */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        De făcut
                    </CardTitle>
                    <CardDescription>Sarcini care trebuie finalizate în această perioadă</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingTasks.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            ✨ Toate sarcinile au fost finalizate!
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {pendingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                                >
                                    {task.assignedUserId === user?.id && (
                                        <Checkbox
                                            checked={false}
                                            onChange={() => completeMutation.mutate(task.id)}
                                            disabled={completeMutation.isPending}
                                            className="h-6 w-6"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">{task.title}</p>
                                        {task.description && (
                                            <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />
                                                {task.department.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {task.assignedUser.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {recurrenceLabels[task.recurrenceType]}
                                                {task.recurrenceType === "WEEKLY" && task.recurrenceDays && (
                                                    <span className="ml-1">
                                                        ({task.recurrenceDays.map(d => dayLabels[d]).join(", ")})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    {isManager && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm(`Sigur vrei să ștergi "${task.title}"?`)) {
                                                    deleteMutation.mutate(task.id);
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-500" />
                            Finalizate
                        </CardTitle>
                        <CardDescription>Sarcini completate în această perioadă</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {completedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center gap-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20"
                                >
                                    <div className="p-2 rounded-full bg-green-500/10">
                                        <Check className="h-4 w-4 text-green-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium line-through text-muted-foreground">{task.title}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {task.assignedUser.name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {recurrenceLabels[task.recurrenceType]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
