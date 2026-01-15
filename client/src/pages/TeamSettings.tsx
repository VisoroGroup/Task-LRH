import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Users,
    Mail,
    UserPlus,
    Shield,
    Clock,
    Check,
    Trash2,
    Copy,
    Send,
} from "lucide-react";

interface Invitation {
    id: string;
    email: string;
    role: "CEO" | "EXECUTIVE" | "USER";
    token: string;
    expiresAt: string;
    acceptedAt: string | null;
    createdAt: string;
    invitedBy?: { id: string; name: string };
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: "CEO" | "EXECUTIVE" | "USER";
    isActive: boolean;
    createdAt: string;
}

const roleLabels = {
    CEO: "Director (CEO)",
    EXECUTIVE: "Executiv",
    USER: "Utilizator",
};

const roleColors = {
    CEO: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    EXECUTIVE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    USER: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function TeamSettings() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState<"CEO" | "EXECUTIVE" | "USER">("USER");
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Fetch team members
    const { data: users = [] } = useQuery<TeamMember[]>({
        queryKey: ["users"],
        queryFn: () => apiRequest("/api/users"),
    });

    // Fetch invitations
    const { data: invitations = [], isLoading: invitationsLoading } = useQuery<Invitation[]>({
        queryKey: ["invitations"],
        queryFn: () => apiRequest("/api/invitations"),
    });

    // Create invitation mutation
    const createInvitationMutation = useMutation({
        mutationFn: async (data: { email: string; role: string }) => {
            return apiRequest("/api/invitations", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            setNewEmail("");
            setNewRole("USER");
            toast({
                title: "Invitație trimisă!",
                description: `Link invitație: ${window.location.origin}${result.inviteUrl}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Eroare",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Delete invitation mutation
    const deleteInvitationMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest(`/api/invitations/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });
            toast({ title: "Invitația a fost ștearsă" });
        },
    });

    // Update user role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            return apiRequest(`/api/users/${userId}/role`, {
                method: "PUT",
                body: JSON.stringify({ role }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast({ title: "Rol actualizat!" });
        },
    });

    const handleSendInvitation = () => {
        if (!newEmail.trim()) {
            toast({ title: "Introdu adresa de email", variant: "destructive" });
            return;
        }
        createInvitationMutation.mutate({ email: newEmail, role: newRole });
    };

    const copyInviteLink = (token: string) => {
        const url = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
        toast({ title: "Link copiat!" });
    };

    const pendingInvitations = invitations.filter(i => !i.acceptedAt);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    Setări Echipă
                </h2>
                <p className="text-muted-foreground">
                    Gestionează membrii echipei și trimite invitații
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Invite New Member */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-emerald-500" />
                            Invită Membru Nou
                        </CardTitle>
                        <CardDescription>
                            Trimite o invitație pe email pentru a adăuga un nou membru în echipă
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email *</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="email@exemplu.com"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rol *</label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-lg border bg-background"
                            >
                                <option value="USER">Utilizator</option>
                                <option value="EXECUTIVE">Executiv</option>
                                <option value="CEO">Director (CEO)</option>
                            </select>
                        </div>
                        <Button
                            onClick={handleSendInvitation}
                            disabled={createInvitationMutation.isPending}
                            className="w-full"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {createInvitationMutation.isPending ? "Se trimite..." : "Trimite Invitație"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Pending Invitations */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Invitații în Așteptare ({pendingInvitations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {invitationsLoading ? (
                            <p className="text-muted-foreground text-sm">Se încarcă...</p>
                        ) : pendingInvitations.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Nu sunt invitații în așteptare</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingInvitations.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                        <div className="space-y-1">
                                            <div className="font-medium text-sm">{inv.email}</div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded border",
                                                    roleColors[inv.role]
                                                )}>
                                                    {roleLabels[inv.role]}
                                                </span>
                                                <span>Expiră: {formatDate(inv.expiresAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyInviteLink(inv.token)}
                                            >
                                                {copiedToken === inv.token ? (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteInvitationMutation.mutate(inv.id)}
                                                className="text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Team Members */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-500" />
                        Membrii Echipei ({users.length})
                    </CardTitle>
                    <CardDescription>
                        Gestionează rolurile membrilor echipei
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nu sunt membri în echipă</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{user.name}</div>
                                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                    </div>
                                    <select
                                        value={user.role}
                                        onChange={(e) => updateRoleMutation.mutate({
                                            userId: user.id,
                                            role: e.target.value,
                                        })}
                                        className={cn(
                                            "px-2 py-1 rounded text-xs font-medium border",
                                            roleColors[user.role]
                                        )}
                                    >
                                        <option value="USER">Utilizator</option>
                                        <option value="EXECUTIVE">Executiv</option>
                                        <option value="CEO">CEO</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
