import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    FileText,
    Building2,
    Users,
    Briefcase,
    Edit2,
    Trash2,
    Check,
} from "lucide-react";

interface Post {
    id: string;
    name: string;
    department: { id: string; name: string };
    user: { id: string; name: string } | null;
}

interface PolicyPost {
    id: string;
    post: Post;
}

interface PolicyDepartment {
    id: string;
    department: { id: string; name: string };
}

interface Policy {
    id: string;
    title: string;
    content: string;
    scope: "COMPANY" | "DEPARTMENT" | "POST";
    isActive: boolean;
    createdBy: { id: string; name: string };
    policyPosts: PolicyPost[];
    policyDepartments?: PolicyDepartment[];
    createdAt: string;
}

interface Department {
    id: string;
    name: string;
    posts: Post[];
}

export function PoliciesPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"COMPANY" | "DEPARTMENT" | "POST">("COMPANY");
    const [isNewPolicyOpen, setIsNewPolicyOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [scope, setScope] = useState<"COMPANY" | "DEPARTMENT" | "POST">("COMPANY");
    const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);

    // Expanded policy state for collapsible cards
    const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

    // Fetch policies
    const { data: policies, isLoading } = useQuery({
        queryKey: ["policies"],
        queryFn: () => apiRequest<Policy[]>("/api/policies"),
    });

    // Fetch departments with posts for selection
    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: () => apiRequest<Department[]>("/api/departments"),
    });

    // Fetch current user (for createdById)
    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => apiRequest<{ id: string; name: string; role: string }>("/api/auth/me"),
    });

    // Create policy mutation
    const createPolicyMutation = useMutation({
        mutationFn: async (data: {
            title: string;
            content: string;
            scope: string;
            createdById: string;
            postIds?: string[];
            departmentIds?: string[];
        }) => {
            return apiRequest("/api/policies", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["policies"] });
            toast({ title: "Politică creată!", variant: "success" as any });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: "Eroare", description: error.message, variant: "destructive" });
        },
    });

    // Update policy mutation
    const updatePolicyMutation = useMutation({
        mutationFn: async (data: { id: string; title: string; content: string; scope: string }) => {
            return apiRequest(`/api/policies/${data.id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["policies"] });
            toast({ title: "Politică actualizată!", variant: "success" as any });
            closeDialog();
        },
        onError: (error: Error) => {
            toast({ title: "Eroare", description: error.message, variant: "destructive" });
        },
    });

    // Delete policy mutation
    const deletePolicyMutation = useMutation({
        mutationFn: async (id: string) => {
            return apiRequest(`/api/policies/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["policies"] });
            toast({ title: "Politică ștearsă!", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({ title: "Eroare", description: error.message, variant: "destructive" });
        },
    });

    const closeDialog = () => {
        setIsNewPolicyOpen(false);
        setEditingPolicy(null);
        setTitle("");
        setContent("");
        setScope("COMPANY");
        setSelectedPostIds([]);
        setSelectedDepartmentIds([]);
    };

    const openEditDialog = (policy: Policy) => {
        setEditingPolicy(policy);
        setTitle(policy.title);
        setContent(policy.content);
        setScope(policy.scope);
        setSelectedPostIds(policy.policyPosts?.map(pp => pp.post.id) || []);
        setSelectedDepartmentIds(policy.policyDepartments?.map(pd => pd.department.id) || []);
        setIsNewPolicyOpen(true);
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            toast({ title: "Cím és tartalom kötelező!", variant: "destructive" });
            return;
        }

        if (editingPolicy) {
            // Update existing
            await updatePolicyMutation.mutateAsync({
                id: editingPolicy.id,
                title,
                content,
                scope,
            });
        } else {
            // Create new
            createPolicyMutation.mutate({
                title,
                content,
                scope,
                createdById: currentUser?.id || "",
                postIds: scope === "POST" ? selectedPostIds : undefined,
                departmentIds: scope === "DEPARTMENT" ? selectedDepartmentIds : undefined,
            });
        }
    };

    const togglePostSelection = (postId: string) => {
        setSelectedPostIds(prev =>
            prev.includes(postId)
                ? prev.filter(id => id !== postId)
                : [...prev, postId]
        );
    };

    const toggleDepartmentSelection = (deptId: string) => {
        setSelectedDepartmentIds(prev =>
            prev.includes(deptId)
                ? prev.filter(id => id !== deptId)
                : [...prev, deptId]
        );
    };

    const filteredPolicies = policies?.filter(p => p.scope === activeTab) || [];

    const getScopeLabel = (s: "COMPANY" | "DEPARTMENT" | "POST") => {
        switch (s) {
            case "COMPANY": return "la nivel de companie";
            case "DEPARTMENT": return "la nivel de departament";
            case "POST": return "specific postului";
        }
    };

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Directive de funcționare</h2>
                    <p className="text-muted-foreground">Directive operaționale (la nivel de companie / departament / post)</p>
                </div>
                <Button onClick={() => setIsNewPolicyOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Politică nouă
                </Button>
            </div>

            {/* Tabs - 3 tabs now */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab("COMPANY")}
                    className={cn(
                        "px-4 py-2 font-medium transition-colors",
                        activeTab === "COMPANY"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Building2 className="h-4 w-4 inline mr-2" />
                    Companie
                </button>
                <button
                    onClick={() => setActiveTab("DEPARTMENT")}
                    className={cn(
                        "px-4 py-2 font-medium transition-colors",
                        activeTab === "DEPARTMENT"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Briefcase className="h-4 w-4 inline mr-2" />
                    Departament
                </button>
                <button
                    onClick={() => setActiveTab("POST")}
                    className={cn(
                        "px-4 py-2 font-medium transition-colors",
                        activeTab === "POST"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Users className="h-4 w-4 inline mr-2" />
                    Post
                </button>
            </div>

            {/* Policies List */}
            <div className="grid gap-4">
                {filteredPolicies.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            Nu există {getScopeLabel(activeTab)} directivă de funcționare.
                            <br />
                            <Button variant="link" onClick={() => setIsNewPolicyOpen(true)}>
                                Crează una!
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    filteredPolicies.map(policy => (
                        <Card
                            key={policy.id}
                            className={cn(
                                "hover:shadow-md transition-all cursor-pointer",
                                expandedPolicyId === policy.id && "ring-2 ring-primary/50"
                            )}
                            onClick={() => setExpandedPolicyId(expandedPolicyId === policy.id ? null : policy.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{policy.title}</CardTitle>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Létrehozta: {policy.createdBy?.name} • {new Date(policy.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(policy)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deletePolicyMutation.mutate(policy.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {expandedPolicyId === policy.id && (
                                <CardContent className="pt-0 border-t mt-2">
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3 pt-3">
                                        {policy.content}
                                    </p>
                                    {/* Show assigned posts for POST scope */}
                                    {policy.scope === "POST" && policy.policyPosts?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {policy.policyPosts.map(pp => (
                                                <span
                                                    key={pp.id}
                                                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                                                >
                                                    {pp.post.name} ({pp.post.department?.name})
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* Show assigned departments for DEPARTMENT scope */}
                                    {policy.scope === "DEPARTMENT" && policy.policyDepartments && policy.policyDepartments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {policy.policyDepartments.map(pd => (
                                                <span
                                                    key={pd.id}
                                                    className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded-full"
                                                >
                                                    {pd.department.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isNewPolicyOpen} onOpenChange={setIsNewPolicyOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPolicy ? "Editare Politică" : "Politică Nouă"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPolicy
                                ? "Modifică datele politicii"
                                : "Creează o nouă politică pentru organizație"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium">Titlu *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                placeholder="ex. Reguli comunicare telefonică"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Domeniu de aplicare *</label>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === "COMPANY"}
                                        onChange={() => setScope("COMPANY")}
                                        className="w-4 h-4"
                                    />
                                    <Building2 className="h-4 w-4" />
                                    La nivel de companie
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === "DEPARTMENT"}
                                        onChange={() => setScope("DEPARTMENT")}
                                        className="w-4 h-4"
                                    />
                                    <Briefcase className="h-4 w-4" />
                                    La nivel de departament
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={scope === "POST"}
                                        onChange={() => setScope("POST")}
                                        className="w-4 h-4"
                                    />
                                    <Users className="h-4 w-4" />
                                    Specific postului
                                </label>
                            </div>
                        </div>

                        {/* Department Selection (for DEPARTMENT scope) */}
                        {scope === "DEPARTMENT" && (
                            <div>
                                <label className="text-sm font-medium">Selectare departamente *</label>
                                <div className="mt-2 flex flex-wrap gap-2 p-3 border rounded-md">
                                    {departments?.map(dept => (
                                        <button
                                            key={dept.id}
                                            type="button"
                                            onClick={() => toggleDepartmentSelection(dept.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1",
                                                selectedDepartmentIds.includes(dept.id)
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-muted hover:bg-muted/80"
                                            )}
                                        >
                                            {selectedDepartmentIds.includes(dept.id) && (
                                                <Check className="h-3 w-3" />
                                            )}
                                            {dept.name}
                                        </button>
                                    ))}
                                </div>
                                {selectedDepartmentIds.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {selectedDepartmentIds.length} departamente selectate
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Post Selection (for POST scope) */}
                        {scope === "POST" && (
                            <div>
                                <label className="text-sm font-medium">Selectare posturi *</label>
                                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-3 space-y-3">
                                    {departments?.map(dept => (
                                        <div key={dept.id}>
                                            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                                {dept.name}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {dept.posts?.map(post => (
                                                    <button
                                                        key={post.id}
                                                        type="button"
                                                        onClick={() => togglePostSelection(post.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1",
                                                            selectedPostIds.includes(post.id)
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted hover:bg-muted/80"
                                                        )}
                                                    >
                                                        {selectedPostIds.includes(post.id) && (
                                                            <Check className="h-3 w-3" />
                                                        )}
                                                        {post.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedPostIds.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {selectedPostIds.length} posturi selectate
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium">Conținut *</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background min-h-[150px]"
                                placeholder="Descrieți în detaliu directiva de funcționare..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                            Renunță
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                !title.trim() ||
                                !content.trim() ||
                                (scope === "POST" && selectedPostIds.length === 0) ||
                                (scope === "DEPARTMENT" && selectedDepartmentIds.length === 0)
                            }
                        >
                            {editingPolicy ? "Salvează" : "Crează"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
