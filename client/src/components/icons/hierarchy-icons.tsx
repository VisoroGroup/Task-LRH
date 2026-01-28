// Hierarchy Icons for LRH Admin Scale

// Hierarchy Level Colors
export const hierarchyColors = {
    SUBGOAL: "#8B5CF6", // violet-500
    PLAN: "#3B82F6",    // blue-500
    PROGRAM: "#10B981", // emerald-500
    PROJECT: "#F59E0B", // amber-500
    INSTRUCTION: "#EF4444", // red-500
};

// Obiectiv Icon (Target/Bullseye)
export function ObiectivIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
        </svg>
    );
}

// Plan Icon (Calendar with gear)
export function PlanIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M3 10h18" />
            <circle cx="15" cy="16" r="3" />
            <path d="M15 14v4" />
            <path d="M13 16h4" />
        </svg>
    );
}

// Program Icon (Flowchart/Hierarchy)
export function ProgramIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <rect x="2" y="12" width="6" height="4" rx="1" />
            <rect x="9" y="12" width="6" height="4" rx="1" />
            <rect x="16" y="12" width="6" height="4" rx="1" />
            <path d="M12 6v6" />
            <path d="M5 12v-2a2 2 0 012-2h10a2 2 0 012 2v2" />
        </svg>
    );
}

// Project Icon (Crane)
export function ProiectIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 21V4" />
            <path d="M5 4l14 3" />
            <path d="M5 7l10 2" />
            <path d="M19 7v5" />
            <rect x="16" y="12" width="6" height="5" rx="1" />
            <path d="M19 17v2" />
            <path d="M3 21h4" />
        </svg>
    );
}

// De făcut Icon (Checklist with pen)
export function DeFacutIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="14" height="18" rx="2" />
            <path d="M7 7h6" />
            <path d="M7 11h6" />
            <path d="M7 15h3" />
            <path d="M17 13l4 4" />
            <path d="M21 13l-4 4" />
            <path d="M19 11v8" />
        </svg>
    );
}

// Get icon component by hierarchy level
export function getHierarchyIcon(level: string, className?: string) {
    switch (level) {
        case "SUBGOAL":
            return <ObiectivIcon className={className} />;
        case "PLAN":
            return <PlanIcon className={className} />;
        case "PROGRAM":
            return <ProgramIcon className={className} />;
        case "PROJECT":
            return <ProiectIcon className={className} />;
        case "INSTRUCTION":
            return <DeFacutIcon className={className} />;
        default:
            return null;
    }
}

// Get color by hierarchy level
export function getHierarchyColor(level: string): string {
    return hierarchyColors[level as keyof typeof hierarchyColors] || "#6B7280";
}

// Hierarchy badge component
export function HierarchyBadge({
    level,
    label,
    className = ""
}: {
    level: string;
    label?: string;
    className?: string;
}) {
    const color = getHierarchyColor(level);
    const icon = getHierarchyIcon(level, "h-4 w-4");

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-white ${className}`}
            style={{ backgroundColor: color }}
        >
            {icon}
            {label && <span>{label}</span>}
        </span>
    );
}
