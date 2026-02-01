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
            toast({ title: "Setări salvate", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Nu s-a putut salva", description: error.message, variant: "destructive" });
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
            toast({ title: "Misiune creată", variant: "success" as any });
            setIsEditingMainGoal(false);
        },
        onError: (error: Error) => {
            toast({ title: "Nu s-a putut crea", description: error.message, variant: "destructive" });
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
            toast({ title: "Misiune actualizată", variant: "success" as any });
            setIsEditingMainGoal(false);
        },
        onError: (error: Error) => {
            toast({ title: "Nu s-a putut actualiza", description: error.message, variant: "destructive" });
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
                <h2 className="text-2xl font-bold">Setări</h2>
                <p className="text-muted-foreground">
                    Configurează comportamentul sistemului și obiectivele companiei
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>
            ) : (
                <div className="grid gap-6 max-w-2xl">
                    {/* Company Main Goal */}
                    <Card className="border-purple-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-purple-500" />
                                Misiunea companiei
                            </CardTitle>
                            <CardDescription>
                                Obiectivul principal al companiei. Setați-l o singură dată și se aplică tuturor departamentelor.
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
                                        Editează misiunea
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Titlul obiectivului *</label>
                                        <input
                                            type="text"
                                            value={mainGoalTitle}
                                            onChange={(e) => setMainGoalTitle(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                            placeholder="ex., A deveni lider de piață în România"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Descriere</label>
                                        <textarea
                                            value={mainGoalDescription}
                                            onChange={(e) => setMainGoalDescription(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                            rows={3}
                                            placeholder="Descrierea detaliată a obiectivului principal al companiei..."
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
                                                Anulează
                                            </Button>
                                        )}
                                        <Button
                                            onClick={handleSaveMainGoal}
                                            disabled={!mainGoalTitle.trim()}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {mainGoal ? "Actualizează misiunea" : "Creează misiune"}
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
                                Control flux
                            </CardTitle>
                            <CardDescription>
                                Configurează modul în care sistemul detectează de făcut blocate și condițiile de supraîncărcare
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Prag detectare blocare
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
                                    <span className="text-muted-foreground">zile fără actualizare</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Prag supraîncărcare
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
                                    <span className="text-muted-foreground">elemente active per persoană</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5" />
                                Informații sistem
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Versiune</span>
                                    <span>1.0.0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sistem</span>
                                    <span>Visoro Task Manager</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Stare</span>
                                    <span className="text-green-600">● Operațional</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <Button onClick={handleSave} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Salvează setările
                    </Button>
                </div>
            )}
        </div>
    );
}
