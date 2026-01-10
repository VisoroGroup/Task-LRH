import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, cn } from "@/lib/utils";
import {
    Plus,
    ChevronRight,
    ChevronDown,
    Target,
    Flag,
    Layers,
    FolderKanban,
    ClipboardList,
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
    department: { id: string; name: string };
    subgoals: Subgoal[];
}

export function IdealScene() {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

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

    const toggleExpanded = (id: string) => {
        const newSet = new Set(expandedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedItems(newSet);
    };

    const TreeItem = ({
        id,
        title,
        description,
        level,
        hasChildren,
        children,
        icon
    }: {
        id: string;
        title: string;
        description?: string | null;
        level: number;
        hasChildren: boolean;
        children?: React.ReactNode;
        icon: React.ReactNode;
    }) => {
        const isExpanded = expandedItems.has(id);
        const indent = level * 24;

        return (
            <div>
                <div
                    className={cn(
                        "flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors",
                        level === 0 && "bg-card border mb-2"
                    )}
                    style={{ marginLeft: indent }}
                    onClick={() => hasChildren && toggleExpanded(id)}
                >
                    {hasChildren ? (
                        <button className="mt-1 text-muted-foreground hover:text-foreground">
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}
                    <span className="mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{title}</div>
                        {description && (
                            <div className="text-xs text-muted-foreground truncate">{description}</div>
                        )}
                    </div>
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
                        Organizational goals hierarchy: Main Goal → Subgoal → Program → Project → Instruction
                    </p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Main Goal
                </Button>
            </div>

            {/* Department Filter */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    size="sm"
                    variant={!selectedDepartment ? "default" : "outline"}
                    onClick={() => setSelectedDepartment(null)}
                >
                    All Departments
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
                        Click on items to expand and see their children
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : idealScene && idealScene.length > 0 ? (
                        <div className="space-y-2">
                            {idealScene.map((mainGoal) => (
                                <TreeItem
                                    key={mainGoal.id}
                                    id={mainGoal.id}
                                    title={mainGoal.title}
                                    description={`${mainGoal.department?.name} • Main Goal`}
                                    level={0}
                                    hasChildren={mainGoal.subgoals.length > 0}
                                    icon={<Target className="h-4 w-4 text-purple-500" />}
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
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Ideal Scene defined</h3>
                            <p className="text-muted-foreground mb-4">
                                Start by creating a Main Goal for your organization
                            </p>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Main Goal
                            </Button>
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
                            <span>Main Goal (Főcél)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-indigo-500" />
                            <span>Subgoal (Alcél)</span>
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
