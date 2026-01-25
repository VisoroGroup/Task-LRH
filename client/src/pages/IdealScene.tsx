import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
    Save,
    Target,
    Settings,
    Edit3,
    Eye,
    Sparkles,
} from "lucide-react";

interface MainGoal {
    id: string;
    title: string;
    description: string | null;
    idealSceneContent: string | null;
    department: { id: string; name: string } | null;
}

export function IdealScene() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState("");

    const { data: idealScene, isLoading } = useQuery({
        queryKey: ["ideal-scene"],
        queryFn: () => apiRequest<MainGoal[]>("/api/ideal-scene"),
    });

    const mainGoal = idealScene?.[0];

    // Initialize content when data loads
    useEffect(() => {
        if (mainGoal?.idealSceneContent) {
            setContent(mainGoal.idealSceneContent);
        }
    }, [mainGoal]);

    const updateContentMutation = useMutation({
        mutationFn: (data: { id: string; idealSceneContent: string }) => {
            return apiRequest(`/api/ideal-scene/main-goals/${data.id}/content`, {
                method: "PUT",
                body: JSON.stringify({ idealSceneContent: data.idealSceneContent }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            toast({ title: "Imaginea ideală salvată!", variant: "success" as any });
            setIsEditing(false);
        },
        onError: (error: Error) => {
            toast({
                title: "Eroare la salvare",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleSave = () => {
        if (!mainGoal) return;
        updateContentMutation.mutate({
            id: mainGoal.id,
            idealSceneContent: content,
        });
    };

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-violet-500" />
                        Imaginea ideală
                    </h2>
                    <p className="text-muted-foreground">
                        Viziunea completă a companiei - cum vrem să arate, cum vrem să funcționeze
                    </p>
                </div>
            </div>

            {!mainGoal ? (
                /* No Main Goal configured */
                <Card className="border-dashed">
                    <CardContent className="text-center py-16">
                        <Target className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                        <h3 className="text-xl font-semibold mb-3">Nicio misiune configurată</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Mai întâi trebuie să setați Misiunea companiei în Setări.
                            Aceasta este fundația pe care se construiește imaginea ideală.
                        </p>
                        <Link href="/settings">
                            <Button size="lg">
                                <Settings className="h-4 w-4 mr-2" />
                                Mergi la Setări
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                /* Main Goal exists - show Ideal Scene editor */
                <div className="space-y-6">
                    {/* Mission Banner */}
                    <Card className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0">
                        <CardContent className="py-6">
                            <div className="flex items-center gap-3">
                                <Target className="h-8 w-8" />
                                <div>
                                    <div className="text-xs uppercase tracking-wider opacity-80 mb-1">
                                        Misiunea companiei
                                    </div>
                                    <div className="text-xl font-bold">
                                        {mainGoal.title}
                                    </div>
                                    {mainGoal.description && (
                                        <div className="text-sm opacity-90 mt-1">
                                            {mainGoal.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ideal Scene Document */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-violet-500" />
                                    Documentul imaginii ideale
                                </CardTitle>
                                <CardDescription>
                                    Descrie în detaliu cum vrei să arate compania, cum vrei să funcționeze, unde vrei să ajungă
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setContent(mainGoal.idealSceneContent || "");
                                                setIsEditing(false);
                                            }}
                                        >
                                            Anulează
                                        </Button>
                                        <Button
                                            onClick={handleSave}
                                            disabled={updateContentMutation.isPending}
                                        >
                                            <Save className="h-4 w-4 mr-2" />
                                            {updateContentMutation.isPending ? "Se salvează..." : "Salvează"}
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={() => setIsEditing(true)}>
                                        <Edit3 className="h-4 w-4 mr-2" />
                                        Editează
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Descrie aici viziunea completă a companiei...

Cum vrei să arate compania în mod ideal?
Cum vrei să funcționeze?
Ce standarde și valori trebuie respectate?
Cum arată succesul pentru fiecare departament?
Care sunt rezultatele ideale pe care le aștepți?"
                                    className="w-full min-h-[500px] p-4 rounded-lg border bg-background resize-y text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            ) : (
                                <div className="min-h-[500px] p-4 rounded-lg bg-muted/30">
                                    {content ? (
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                            {content}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16">
                                            <Eye className="h-12 w-12 mb-4 opacity-50" />
                                            <p className="text-lg font-medium mb-2">
                                                Niciun conținut încă
                                            </p>
                                            <p className="text-sm max-w-md mb-4">
                                                Apasă pe "Editează" pentru a începe să scrii viziunea companiei tale.
                                            </p>
                                            <Button onClick={() => setIsEditing(true)}>
                                                <Edit3 className="h-4 w-4 mr-2" />
                                                Începe să scrii
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
