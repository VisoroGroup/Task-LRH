import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// API fetch helper
export async function apiRequest<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(error.error || "Request failed");
    }

    return response.json();
}

// Date formatting
export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("ro-RO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Days since calculation (for stalled detection display)
export function daysSince(date: Date | string): number {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Hierarchy level display names (Romanian)
export const hierarchyLabels: Record<string, string> = {
    SUBGOAL: "Obiectiv",
    PLAN: "Plan",
    PROGRAM: "Program",
    PROJECT: "Proiect",
    INSTRUCTION: "De făcut",
};

// Status display names (Romanian)
export const statusLabels: Record<string, string> = {
    TODO: "De făcut",
    DOING: "În lucru",
    DONE: "Finalizat",
};

// Flow status determination
export function getFlowStatus(
    stalledCount: number,
    overdueCount: number,
    totalActive: number
): "normal" | "overload" | "stalled" {
    if (stalledCount > 0 || overdueCount > 0) return "stalled";
    if (totalActive > 10) return "overload";
    return "normal";
}
