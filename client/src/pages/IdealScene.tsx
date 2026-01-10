import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Link } from "wouter";
import {
    Plus,
    ChevronRight,
    ChevronDown,
    Target,
    Flag,
    Layers,
    FolderKanban,
    ClipboardList,
    Settings,
} from "lucide-react";

interface Instruction {
    id: string;
    title: string;
    description: string | null;
}

interface Project {
    id: string;
    title: string;
    description: string | null;
    instructions: Instruction[];
}

interface Program {
    id: string;
    title: string;
    description: string | null;
    projects: Project[];
}

interface Subgoal {
    id: string;
    title: string;
    description: string | null;
    programs: Program[];
}

interface MainGoal {
    id: string;
    title: string;
    description: string | null;
    department: { id: string; name: string } | null;
    subgoals: Subgoal[];
}

type HierarchyLevel = "subgoal" | "program" | "project" | "instruction";

export function IdealScene() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

    // Dialog state for adding items
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addLevel, setAddLevel] = useState<HierarchyLevel>("subgoal");
    const [addParentId, setAddParentId] = useState("");
    const [addTitle, setAddTitle] = useState("");
    const [addDescription, setAddDescription] = useState("");

    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: () => apiRequest<{ id: string; name: string }[]>("/api/departments"),
    });

    const { data: idealScene, isLoading } = useQuery({
        queryKey: ["ideal-scene", selectedDepartment],
        queryFn: () => {
            const url = selectedDepartment
                ? `/api/ideal-scene?departmentId=${selectedDepartment}`
                : "/api/ideal-scene";
            return apiRequest<MainGoal[]>(url);
        },
    });

    const mainGoal = idealScene?.[0]; // Company has ONE main goal

    const addItemMutation = useMutation({
        mutationFn: (data: { level: HierarchyLevel; parentId: string; title: string; description: string }) => {
            const endpoints: Record<HierarchyLevel, string> = {
                subgoal: "/api/subgoals",
                program: "/api/programs",
                project: "/api/projects",
                instruction: "/api/instructions",
            };
            return apiRequest(endpoints[data.level], {
                method: "POST",
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    parentId: data.parentId,
                }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ideal-scene"] });
            toast({ title: "Item created", variant: "success" as any });
            setAddDialogOpen(false);
            setAddTitle("");
            setAddDescription("");
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to create",
                description: error.message,
                variant: "destructive"
            });
        },
    });

    const handleOpenAddDialog = (level: HierarchyLevel, parentId: string) => {
        setAddLevel(level);
        setAddParentId(parentId);
        setAddTitle("");
        setAddDescription("");
        setAddDialogOpen(true);
    };

    const handleAddItem = () => {
        if (!addTitle.trim()) return;
        addItemMutation.mutate({
            level: addLevel,
            parentId: addParentId,
            title: addTitle,
            description: addDescription,
        });
    };

    const toggleExpanded = (id: string) => {
        const newSet = new Set(expandedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedItems(newSet);
    };

    const levelLabels: Record<HierarchyLevel, string> = {
        subgoal: "Alcél (Subgoal)",
        program: "Program",
        project: "Project",
        instruction: "Instruction",
    };

    const TreeItem = ({
        id,
        title,
        description,
        level,
        hasChildren,
        children,
        icon,
        onAddChild,
        childLabel,
    }: {
        id: string;
        title: string;
        description?: string | null;
        level: number;
        hasChildren: boolean;
        children?: React.ReactNode;
        icon: React.ReactNode;
        onAddChild?: () => void;
        childLabel?: string;
    }) => {
        const isExpanded = expandedItems.has(id);
        const indent = level * 24;

        return (
            <div>
                <div
                    className={cn(
                        "flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors group",
                        level === 0 && "bg-card border mb-2"
                    )}
                    style={{ marginLeft: indent }}
                >
                    <button
                        className="mt-1 text-muted-foreground hover:text-foreground"
                        onClick={() => hasChildren && toggleExpanded(id)}
                    >
                        {hasChildren ? (
                            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                        ) : (
                            <span className="w-4" />
                        )}
                    </button>
                    <span className="mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => hasChildren && toggleExpanded(id)}>
                        <div className="font-medium text-sm">{title}</div>
                        {description && (
                            <div className="text-xs text-muted-foreground truncate">{description}</div>
                        )}
                    </div>
                    {onAddChild && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
                            onClick={onAddChild}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            {childLabel}
                        </Button>
                    )}
                </div>
                {isExpanded && children}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Ideal Scene</h2>
                    <p className="text-muted-foreground">
                        Főcél → Alcél → Program → Project → Instruction
                    </p>
                </div>
                {mainGoal && (
                    <Button onClick={() => handleOpenAddDialog("subgoal", mainGoal.id)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Alcél
                    </Button>
                )}
            </div>

            {/* Add Item Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add {levelLabels[addLevel]}</DialogTitle>
                        <DialogDescription>
                            Create a new item in the hierarchy
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium">Title *</label>
                            <input
                                type="text"
                                value={addTitle}
                                onChange={(e) => setAddTitle(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                placeholder={`Enter ${addLevel} title...`}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                value={addDescription}
                                onChange={(e) => setAddDescription(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                rows={3}
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddItem} disabled={!addTitle.trim()}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Department Filter */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    size="sm"
                    variant={!selectedDepartment ? "default" : "outline"}
                    onClick={() => setSelectedDepartment(null)}
                >
                    All
                </Button>
                {departments?.map((dept) => (
                    <Button
                        key={dept.id}
                        size="sm"
                        variant={selectedDepartment === dept.id ? "default" : "outline"}
                        onClick={() => setSelectedDepartment(dept.id)}
                    >
                        {dept.name}
                    </Button>
                ))}
            </div>

            {/* Hierarchy Tree */}
            <Card>
                <CardHeader>
                    <CardTitle>Goals Hierarchy</CardTitle>
                    <CardDescription>
                        Click to expand • Hover to add children
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : mainGoal ? (
                        <div className="space-y-2">
                            {/* Main Goal (root level, not editable here) */}
                            <TreeItem
                                id={mainGoal.id}
                                title={mainGoal.title}
                                description={mainGoal.description || "Company Main Goal"}
                                level={0}
                                hasChildren={mainGoal.subgoals.length > 0}
                                icon={<Target className="h-4 w-4 text-purple-500" />}
                                onAddChild={() => handleOpenAddDialog("subgoal", mainGoal.id)}
                                childLabel="Alcél"
                            >
                                {mainGoal.subgoals.map((subgoal) => (
                                    <TreeItem
                                        key={subgoal.id}
                                        id={subgoal.id}
                                        title={subgoal.title}
                                        description={subgoal.description}
                                        level={1}
                                        hasChildren={subgoal.programs.length > 0}
                                        icon={<Flag className="h-4 w-4 text-indigo-500" />}
                                        onAddChild={() => handleOpenAddDialog("program", subgoal.id)}
                                        childLabel="Program"
                                    >
                                        {subgoal.programs.map((program) => (
                                            <TreeItem
                                                key={program.id}
                                                id={program.id}
                                                title={program.title}
                                                description={program.description}
                                                level={2}
                                                hasChildren={program.projects.length > 0}
                                                icon={<Layers className="h-4 w-4 text-blue-500" />}
                                                onAddChild={() => handleOpenAddDialog("project", program.id)}
                                                childLabel="Project"
                                            >
                                                {program.projects.map((project) => (
                                                    <TreeItem
                                                        key={project.id}
                                                        id={project.id}
                                                        title={project.title}
                                                        description={project.description}
                                                        level={3}
                                                        hasChildren={project.instructions.length > 0}
                                                        icon={<FolderKanban className="h-4 w-4 text-cyan-500" />}
                                                        onAddChild={() => handleOpenAddDialog("instruction", project.id)}
                                                        childLabel="Instruction"
                                                    >
                                                        {project.instructions.map((instruction) => (
                                                            <TreeItem
                                                                key={instruction.id}
                                                                id={instruction.id}
                                                                title={instruction.title}
                                                                description={instruction.description}
                                                                level={4}
                                                                hasChildren={false}
                                                                icon={<ClipboardList className="h-4 w-4 text-teal-500" />}
                                                            />
                                                        ))}
                                                    </TreeItem>
                                                ))}
                                            </TreeItem>
                                        ))}
                                    </TreeItem>
                                ))}
                            </TreeItem>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Main Goal configured</h3>
                            <p className="text-muted-foreground mb-4">
                                The company's Main Goal must be set in Settings first
                            </p>
                            <Link href="/settings">
                                <Button>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Go to Settings
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Legend */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-500" />
                            <span>Főcél</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-indigo-500" />
                            <span>Alcél</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-500" />
                            <span>Program</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-cyan-500" />
                            <span>Project</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-teal-500" />
                            <span>Instruction</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

