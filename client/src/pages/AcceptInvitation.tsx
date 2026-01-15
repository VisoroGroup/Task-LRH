import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    CheckCircle,
    AlertCircle,
    User,
    Mail,
    Shield,
    Sparkles,
} from "lucide-react";

interface InvitationInfo {
    email: string;
    role: string;
    invitedBy: string;
    valid: boolean;
}

const roleLabels: Record<string, string> = {
    CEO: "Director (CEO)",
    EXECUTIVE: "Executiv",
    USER: "Utilizator",
};

export function AcceptInvitation({ token }: { token: string }) {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [name, setName] = useState("");

    // Validate invitation token
    const { data: invitation, isLoading, error } = useQuery<InvitationInfo>({
        queryKey: ["invitation", token],
        queryFn: () => apiRequest(`/api/invitations/validate/${token}`),
        retry: false,
    });

    // Accept invitation mutation
    const acceptMutation = useMutation({
        mutationFn: async (data: { name: string }) => {
            return apiRequest(`/api/invitations/accept/${token}`, {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            toast({
                title: "Bine ai venit!",
                description: "Contul tău a fost creat. Te redirecționăm...",
            });
            setTimeout(() => {
                setLocation("/my-tasks");
            }, 1500);
        },
        onError: (error: Error) => {
            toast({
                title: "Eroare",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleAccept = () => {
        if (!name.trim()) {
            toast({ title: "Introdu numele tău", variant: "destructive" });
            return;
        }
        acceptMutation.mutate({ name });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-muted-foreground">Se verifică invitația...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !invitation?.valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Invitație Invalidă</h2>
                        <p className="text-muted-foreground mb-6">
                            Această invitație poate fi expirată, deja folosită, sau linkul este incorect.
                        </p>
                        <Button variant="outline" onClick={() => setLocation("/login")}>
                            Înapoi la Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Bine ai venit!</CardTitle>
                    <CardDescription>
                        Ai fost invitat să te alături echipei
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Invitation Info */}
                    <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Email</div>
                                <div className="font-medium">{invitation.email}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Rol</div>
                                <div className="font-medium">{roleLabels[invitation.role] || invitation.role}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Invitat de</div>
                                <div className="font-medium">{invitation.invitedBy}</div>
                            </div>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Numele tău *</label>
                        <Input
                            placeholder="Introdu numele complet"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAccept()}
                        />
                    </div>

                    {/* Accept Button */}
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleAccept}
                        disabled={acceptMutation.isPending}
                    >
                        {acceptMutation.isPending ? (
                            "Se creează contul..."
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Acceptă Invitația
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                        Prin acceptarea invitației, confirmi că ești de acord cu termenii și condițiile.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
