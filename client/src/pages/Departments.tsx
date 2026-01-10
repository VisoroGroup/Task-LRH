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

    const { data: departments, isLoading } = useQuery({
        queryKey: ["departments"],
        queryFn: () => apiRequest<Department[]>("/api/departments"),
    });

    const { data: users } = useQuery({
        queryKey: ["users"],
        queryFn: () => apiRequest<UserType[]>("/api/users"),
    });

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
                    <h2 className="text-2xl font-bold">Departments</h2>
                    <p className="text-muted-foreground">
                        Organizational structure with posts and responsibilities
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Department
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Department</DialogTitle>
                            <DialogDescription>
                                Add a new organizational function
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">Name *</label>
                                <input
                                    type="text"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    placeholder="e.g., Marketing"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={newDeptDescription}
                                    onChange={(e) => setNewDeptDescription(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    rows={3}
                                    placeholder="What this department is responsible for..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={!newDeptName.trim()}>
                                Create Department
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Edit Department Dialog */}
            <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                    </DialogHeader>
                    {editingDept && (
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    type="text"
                                    value={editingDept.name}
                                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={editingDept.description || ""}
                                    onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Department Head</label>
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
                                    <option value="">-- No head --</option>
                                    {users?.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDept(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Department List */}
            {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
                <div className="space-y-4">
                    {[...(departments || [])].sort((a, b) => {
                        // Sort by predefined order
                        const order = ["Administrativ", "HR-Comunicare", "Vânzări", "Financiar", "Producție", "Calitate", "Extindere"];
                        const aIdx = order.findIndex(n => a.name.toLowerCase().includes(n.toLowerCase()));
                        const bIdx = order.findIndex(n => b.name.toLowerCase().includes(n.toLowerCase()));
                        if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
                        if (aIdx === -1) return 1;
                        if (bIdx === -1) return -1;
                        return aIdx - bIdx;
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
                                                        Head: {dept.head.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-600">No head assigned</span>
                                                )}
                                                <span>•</span>
                                                <span>{dept.posts?.length || 0} posts</span>
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
                                <CardContent className="border-t pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Posts
                                        </h4>
                                        <Dialog open={isAddPostOpen === dept.id} onOpenChange={(open) => setIsAddPostOpen(open ? dept.id : null)}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <UserPlus className="h-3 w-3 mr-1" />
                                                    Add Post
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add Post to {dept.name}</DialogTitle>
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
                                        <p className="text-sm text-muted-foreground italic">No posts defined yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {dept.posts?.map((post) => (
                                                <div key={post.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Info Card */}
            <Card className="border-dashed">
                <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h4 className="font-medium mb-1">Department & Posts Rules</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Each department has one head (responsible person)</li>
                                <li>• Posts are positions within the department</li>
                                <li>• Each post can have one person assigned to it</li>
                                <li>• Vacant posts are highlighted in yellow</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
