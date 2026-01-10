import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Settings as SettingsIcon,
    Clock,
    Save,
    Target,
    Edit2,
} from "lucide-react";

interface Setting {
    key: string;
    value: any;
    updatedAt: string;
}

interface MainGoal {
    id: string;
    title: string;
    description: string | null;
}

export function Settings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [stalledDays, setStalledDays] = useState<number | null>(null);
    const [overloadThreshold, setOverloadThreshold] = useState<number | null>(null);
    const [mainGoalTitle, setMainGoalTitle] = useState("");
    const [mainGoalDescription, setMainGoalDescription] = useState("");
    const [isEditingMainGoal, setIsEditingMainGoal] = useState(false);

    const { isLoading } = useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            const data = await apiRequest<Setting[]>("/api/settings");
            const stalledSetting = data.find(s => s.key === "stalled_threshold_days");
            const overloadSetting = data.find(s => s.key === "overload_threshold");
            if (stalledSetting && stalledDays === null) {
                setStalledDays((stalledSetting.value as { days: number }).days);
            }
            if (overloadSetting && overloadThreshold === null) {
                setOverloadThreshold((overloadSetting.value as { tasks: number }).tasks);
            }
            return data;
        },
    });

    const { data: mainGoals } = useQuery({
        queryKey: ["main-goals"],
        queryFn: () => apiRequest<MainGoal[]>("/api/main-goals"),
    });

    const mainGoal = mainGoals?.[0]; // Company has only ONE main goal

    useEffect(() => {
        if (mainGoal && !isEditingMainGoal) {
            setMainGoalTitle(mainGoal.title);
            setMainGoalDescription(mainGoal.description || "");
        }
    }, [mainGoal, isEditingMainGoal]);

    const updateMutation = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: any }) => {
            return apiRequest(`/api/settings/${key}`, {
                method: "PUT",
                body: JSON.stringify({ value }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["settings"] });
            toast({ title: "Settings saved", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to save", description: error.message, variant: "destructive" });
        },
    });

    const createMainGoalMutation = useMutation({
        mutationFn: (data: { title: string; description: string }) =>
            apiRequest("/api/main-goals", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["main-goals"] });
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            toast({ title: "Main Goal created", variant: "success" as any });
            setIsEditingMainGoal(false);
        },
        onError: (error: Error) => {
            toast({ title: "Failed to create", description: error.message, variant: "destructive" });
        },
    });

    const updateMainGoalMutation = useMutation({
        mutationFn: ({ id, title, description }: { id: string; title: string; description: string }) =>
            apiRequest(`/api/main-goals/${id}`, {
                method: "PUT",
                body: JSON.stringify({ title, description }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["main-goals"] });
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            toast({ title: "Main Goal updated", variant: "success" as any });
            setIsEditingMainGoal(false);
        },
        onError: (error: Error) => {
            toast({ title: "Failed to update", description: error.message, variant: "destructive" });
        },
    });

    const handleSave = () => {
        if (stalledDays !== null) {
            updateMutation.mutate({
                key: "stalled_threshold_days",
                value: { days: stalledDays },
            });
        }
        if (overloadThreshold !== null) {
            updateMutation.mutate({
                key: "overload_threshold",
                value: { tasks: overloadThreshold },
            });
        }
    };

    const handleSaveMainGoal = () => {
        if (!mainGoalTitle.trim()) return;
        if (mainGoal) {
            updateMainGoalMutation.mutate({
                id: mainGoal.id,
                title: mainGoalTitle,
                description: mainGoalDescription,
            });
        } else {
            createMainGoalMutation.mutate({
                title: mainGoalTitle,
                description: mainGoalDescription,
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-muted-foreground">
                    Configure system behavior and company goals
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
                <div className="grid gap-6 max-w-2xl">
                    {/* Company Main Goal */}
                    <Card className="border-purple-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-purple-500" />
                                Company Main Goal (Főcél)
                            </CardTitle>
                            <CardDescription>
                                The company's primary objective. Set this once and it applies to all departments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {mainGoal && !isEditingMainGoal ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                        <h3 className="font-semibold text-lg">{mainGoal.title}</h3>
                                        {mainGoal.description && (
                                            <p className="text-muted-foreground text-sm mt-2">
                                                {mainGoal.description}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditingMainGoal(true)}
                                    >
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Main Goal
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Goal Title *</label>
                                        <input
                                            type="text"
                                            value={mainGoalTitle}
                                            onChange={(e) => setMainGoalTitle(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                            placeholder="e.g., Become market leader in Romania"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Description</label>
                                        <textarea
                                            value={mainGoalDescription}
                                            onChange={(e) => setMainGoalDescription(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                            rows={3}
                                            placeholder="Detailed description of the company's main objective..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {mainGoal && (
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setMainGoalTitle(mainGoal.title);
                                                    setMainGoalDescription(mainGoal.description || "");
                                                    setIsEditingMainGoal(false);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        <Button
                                            onClick={handleSaveMainGoal}
                                            disabled={!mainGoalTitle.trim()}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {mainGoal ? "Update Main Goal" : "Create Main Goal"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Flow Control Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Flow Control
                            </CardTitle>
                            <CardDescription>
                                Configure how the system detects stalled tasks and overload conditions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Stalled Detection Threshold
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={stalledDays ?? 3}
                                        onChange={(e) => setStalledDays(parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 border rounded-md bg-background text-center"
                                    />
                                    <span className="text-muted-foreground">days without update</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Overload Threshold
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={overloadThreshold ?? 10}
                                        onChange={(e) => setOverloadThreshold(parseInt(e.target.value))}
                                        className="w-20 px-3 py-2 border rounded-md bg-background text-center"
                                    />
                                    <span className="text-muted-foreground">active items per person</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5" />
                                System Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Version</span>
                                    <span>1.0.0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">System</span>
                                    <span>Visoro Task Manager</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className="text-green-600">● Operational</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <Button onClick={handleSave} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                    </Button>
                </div>
            )}
        </div>
    );
}
