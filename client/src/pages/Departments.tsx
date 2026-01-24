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
    DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    Building2,
    Edit2,
    Archive,
    AlertCircle,
    Users,
    User,
    UserPlus,
    Trash2,
    ChevronDown,
    ChevronRight,
    FileText,
    ScrollText,
} from "lucide-react";

interface UserType {
    id: string;
    name: string;
    email: string;
}

interface Post {
    id: string;
    name: string;
    description: string | null;
    userId: string | null;
    user: UserType | null;
}

interface Department {
    id: string;
    name: string;
    description: string | null;
    departmentHeadId: string | null;
    head: UserType | null;
    posts: Post[];
    isActive: boolean;
    createdAt: string;
    sortOrder: number;
}

interface PolicyPost {
    id: string;
    post: { id: string; name: string };
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
    policyPosts?: PolicyPost[];
    policyDepartments?: PolicyDepartment[];
}

export function Departments() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [newDeptName, setNewDeptName] = useState("");
    const [newDeptDescription, setNewDeptDescription] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [newPostName, setNewPostName] = useState("");
    const [newPostUserId, setNewPostUserId] = useState("");
    const [isAddPostOpen, setIsAddPostOpen] = useState<string | null>(null);

    // Policy states
    const [expandedDeptPolicies, setExpandedDeptPolicies] = useState<string | null>(null);
    const [expandedPostPolicies, setExpandedPostPolicies] = useState<string | null>(null);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

    const { data: departments, isLoading } = useQuery({
        queryKey: ["departments"],
        queryFn: () => apiRequest<Department[]>("/api/departments"),
    });

    const { data: users } = useQuery({
        queryKey: ["users"],
        queryFn: () => apiRequest<UserType[]>("/api/users"),
    });

    const { data: policies } = useQuery({
        queryKey: ["policies"],
        queryFn: () => apiRequest<Policy[]>("/api/policies"),
    });

    // Helper to get policies for a department
    const getDepartmentPolicies = (deptId: string) => {
        return policies?.filter(p =>
            p.scope === "DEPARTMENT" &&
            p.policyDepartments?.some(pd => pd.department.id === deptId)
        ) || [];
    };

    // Helper to get policies for a post
    const getPostPolicies = (postId: string) => {
        return policies?.filter(p =>
            p.scope === "POST" &&
            p.policyPosts?.some(pp => pp.post.id === postId)
        ) || [];
    };

    const createMutation = useMutation({
        mutationFn: (data: { name: string; description: string }) =>
            apiRequest("/api/departments", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Department created", variant: "success" as any });
            setIsCreateOpen(false);
            setNewDeptName("");
            setNewDeptDescription("");
        },
        onError: (error: Error) => {
            toast({ title: "Failed to create", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name, description }: { id: string; name: string; description: string }) =>
            apiRequest(`/api/departments/${id}`, {
                method: "PUT",
                body: JSON.stringify({ name, description }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Department updated", variant: "success" as any });
            setEditingDept(null);
        },
        onError: (error: Error) => {
            toast({ title: "Failed to update", description: error.message, variant: "destructive" });
        },
    });

    const setHeadMutation = useMutation({
        mutationFn: ({ id, departmentHeadId }: { id: string; departmentHeadId: string | null }) =>
            apiRequest(`/api/departments/${id}/head`, {
                method: "PUT",
                body: JSON.stringify({ departmentHeadId }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Department head updated", variant: "success" as any });
        },
    });

    const createPostMutation = useMutation({
        mutationFn: (data: { name: string; departmentId: string; userId: string | null }) =>
            apiRequest("/api/posts", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Post created", variant: "success" as any });
            setIsAddPostOpen(null);
            setNewPostName("");
            setNewPostUserId("");
        },
    });

    const updatePostMutation = useMutation({
        mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
            apiRequest(`/api/posts/${id}`, {
                method: "PUT",
                body: JSON.stringify({ userId }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Post updated", variant: "success" as any });
        },
    });

    const deletePostMutation = useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/api/posts/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Post removed", variant: "success" as any });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            apiRequest(`/api/departments/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            toast({ title: "Department archived", variant: "success" as any });
        },
        onError: (error: Error) => {
            toast({
                title: "Cannot archive department",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleCreate = () => {
        if (!newDeptName.trim()) return;
        createMutation.mutate({ name: newDeptName, description: newDeptDescription });
    };

    const handleUpdate = () => {
        if (!editingDept) return;
        updateMutation.mutate({
            id: editingDept.id,
            name: editingDept.name,
            description: editingDept.description || "",
        });
    };

    const handleAddPost = (departmentId: string) => {
        if (!newPostName.trim()) return;
        createPostMutation.mutate({
            name: newPostName,
            departmentId,
            userId: newPostUserId || null,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Departamente</h2>
                    <p className="text-muted-foreground">
                        Structură organizațională cu posturi și responsabilități
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Departament nou
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Creează departament</DialogTitle>
                            <DialogDescription>
                                Adaugă o nouă funcție organizațională
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">Nume *</label>
                                <input
                                    type="text"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    placeholder="ex., Marketing"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Descriere</label>
                                <textarea
                                    value={newDeptDescription}
                                    onChange={(e) => setNewDeptDescription(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    rows={3}
                                    placeholder="Pentru ce este responsabil acest departament..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Anulează
                            </Button>
                            <Button onClick={handleCreate} disabled={!newDeptName.trim()}>
                                Creează departament
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Department Dialog */}
            <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editează departament</DialogTitle>
                    </DialogHeader>
                    {editingDept && (
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">Nume</label>
                                <input
                                    type="text"
                                    value={editingDept.name}
                                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Descriere</label>
                                <textarea
                                    value={editingDept.description || ""}
                                    onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Șef departament</label>
                                <select
                                    value={editingDept.departmentHeadId || ""}
                                    onChange={(e) => {
                                        setHeadMutation.mutate({
                                            id: editingDept.id,
                                            departmentHeadId: e.target.value || null,
                                        });
                                    }}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                >
                                    <option value="">-- Fără șef --</option>
                                    {users?.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDept(null)}>
                            Anulează
                        </Button>
                        <Button onClick={handleUpdate}>Salvează modificările</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Department List */}
            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>
            ) : (
                <div className="space-y-4">
                    {[...(departments || [])].sort((a, b) => {
                        // Sort by sortOrder from database
                        return (a.sortOrder || 99) - (b.sortOrder || 99);
                    }).map((dept) => (
                        <Card key={dept.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer"
                                        onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                                    >
                                        {expandedDept === dept.id ?
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" /> :
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        }
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{dept.name}</CardTitle>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                {dept.head ? (
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        Șef departament: {dept.head.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-600">Niciun șef desemnat</span>
                                                )}
                                                <span>•</span>
                                                <span>{dept.posts?.length || 0} posturi</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setEditingDept(dept)}>
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-muted-foreground"
                                            onClick={() => deleteMutation.mutate(dept.id)}
                                        >
                                            <Archive className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Expanded posts section */}
                            {expandedDept === dept.id && (
                                <CardContent className="border-t pt-4 space-y-6">
                                    {/* Department Policies Section */}
                                    {getDepartmentPolicies(dept.id).length > 0 && (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setExpandedDeptPolicies(
                                                    expandedDeptPolicies === dept.id ? null : dept.id
                                                )}
                                                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                                            >
                                                {expandedDeptPolicies === dept.id ?
                                                    <ChevronDown className="h-4 w-4" /> :
                                                    <ChevronRight className="h-4 w-4" />
                                                }
                                                <ScrollText className="h-4 w-4" />
                                                Directive de funcționare ({getDepartmentPolicies(dept.id).length})
                                            </button>
                                            {expandedDeptPolicies === dept.id && (
                                                <div className="ml-6 space-y-1">
                                                    {getDepartmentPolicies(dept.id).map(policy => (
                                                        <button
                                                            key={policy.id}
                                                            onClick={() => setSelectedPolicy(policy)}
                                                            className="block w-full text-left px-3 py-2 text-sm bg-primary/5 hover:bg-primary/10 rounded-md transition-colors"
                                                        >
                                                            <FileText className="h-3 w-3 inline mr-2 text-primary" />
                                                            {policy.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Posts Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Posturi
                                            </h4>
                                            <Dialog open={isAddPostOpen === dept.id} onOpenChange={(open) => setIsAddPostOpen(open ? dept.id : null)}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline">
                                                        <UserPlus className="h-3 w-3 mr-1" />
                                                        Adaugă post
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Adaugă post la {dept.name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div>
                                                            <label className="text-sm font-medium">Post Name *</label>
                                                            <input
                                                                type="text"
                                                                value={newPostName}
                                                                onChange={(e) => setNewPostName(e.target.value)}
                                                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                                                placeholder="e.g., Secretary, Accountant"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium">Assigned To</label>
                                                            <select
                                                                value={newPostUserId}
                                                                onChange={(e) => setNewPostUserId(e.target.value)}
                                                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                                            >
                                                                <option value="">-- Vacant --</option>
                                                                {users?.map(u => (
                                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setIsAddPostOpen(null)}>Cancel</Button>
                                                        <Button onClick={() => handleAddPost(dept.id)} disabled={!newPostName.trim()}>
                                                            Add Post
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                        {dept.posts?.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic">Nu există posturi definite încă</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {dept.posts?.map((post) => {
                                                    const postPolicies = getPostPolicies(post.id);
                                                    return (
                                                        <div key={post.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-medium">{post.name}</div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {post.user ? post.user.name : <span className="text-yellow-600">Vacant</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        value={post.userId || ""}
                                                                        onChange={(e) => updatePostMutation.mutate({
                                                                            id: post.id,
                                                                            userId: e.target.value || null,
                                                                        })}
                                                                        className="text-sm px-2 py-1 border rounded bg-background"
                                                                    >
                                                                        <option value="">Vacant</option>
                                                                        {users?.map(u => (
                                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-destructive h-7 w-7 p-0"
                                                                        onClick={() => deletePostMutation.mutate(post.id)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            {/* Post Policies */}
                                                            {postPolicies.length > 0 && (
                                                                <div className="pt-2 border-t border-border/50">
                                                                    <button
                                                                        onClick={() => setExpandedPostPolicies(
                                                                            expandedPostPolicies === post.id ? null : post.id
                                                                        )}
                                                                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                                                    >
                                                                        {expandedPostPolicies === post.id ?
                                                                            <ChevronDown className="h-3 w-3" /> :
                                                                            <ChevronRight className="h-3 w-3" />
                                                                        }
                                                                        <ScrollText className="h-3 w-3" />
                                                                        Directive ({postPolicies.length})
                                                                    </button>
                                                                    {expandedPostPolicies === post.id && (
                                                                        <div className="mt-1 ml-4 space-y-1">
                                                                            {postPolicies.map(policy => (
                                                                                <button
                                                                                    key={policy.id}
                                                                                    onClick={() => setSelectedPolicy(policy)}
                                                                                    className="block w-full text-left px-2 py-1 text-xs bg-primary/5 hover:bg-primary/10 rounded transition-colors"
                                                                                >
                                                                                    <FileText className="h-3 w-3 inline mr-1 text-primary" />
                                                                                    {policy.title}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Policy Detail Popup */}
            <Dialog open={!!selectedPolicy} onOpenChange={(open) => !open && setSelectedPolicy(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ScrollText className="h-5 w-5 text-primary" />
                            {selectedPolicy?.title}
                        </DialogTitle>
                        <DialogDescription>
                            Directivă de funcționare
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                            {selectedPolicy?.content}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSelectedPolicy(null)}>Închide</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Info Card */}
            <Card className="border-dashed">
                <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h4 className="font-medium mb-1">Reguli departamente și posturi</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Fiecare departament are un șef (persoană responsabilă)</li>
                                <li>• Posturile sunt poziții în cadrul departamentului</li>
                                <li>• Fiecare post poate avea o persoană atribuită</li>
                                <li>• Posturile vacante sunt evidențiate cu galben</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
