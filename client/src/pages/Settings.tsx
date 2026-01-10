import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Settings as SettingsIcon,
    Clock,
    Save,
} from "lucide-react";

interface Setting {
    key: string;
    value: any;
    updatedAt: string;
}

export function Settings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [stalledDays, setStalledDays] = useState<number | null>(null);
    const [overloadThreshold, setOverloadThreshold] = useState<number | null>(null);

    const { isLoading } = useQuery({
        queryKey: ["settings"],
        queryFn: async () => {
            const data = await apiRequest<Setting[]>("/api/settings");
            // Set local state from fetched settings
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-muted-foreground">
                    Configure system behavior and thresholds
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
                <div className="grid gap-6 max-w-2xl">
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
                            {/* Stalled Threshold */}
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
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tasks in DOING status with no update for this many days are marked as stalled
                                </p>
                            </div>

                            {/* Overload Threshold */}
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
                                    <span className="text-muted-foreground">active tasks per post holder</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Post holders with more active tasks than this are shown in yellow (overload) status
                                </p>
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
