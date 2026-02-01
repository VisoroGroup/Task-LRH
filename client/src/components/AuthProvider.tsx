import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/utils";

interface User {
    id: string;
    email: string;
    name: string;
    role: "CEO" | "EXECUTIVE" | "USER";
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
    hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: ["auth-user"],
        queryFn: async () => {
            try {
                return await apiRequest<User>("/api/auth/me");
            } catch (err) {
                // Not authenticated
                return null;
            }
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        queryClient.setQueryData(["auth-user"], null);
        window.location.href = "/login";
    };

    const hasRole = (...roles: string[]) => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    const value: AuthContextType = {
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        logout,
        hasRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

// Protected route wrapper
export function RequireAuth({
    children,
    roles
}: {
    children: ReactNode;
    roles?: string[];
}) {
    const { user, isLoading, isAuthenticated, hasRole } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Se încarcă...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        window.location.href = "/login";
        return null;
    }

    if (roles && !hasRole(...roles)) {
        // Redirect users without permission to the tasks page
        window.location.href = "/sarcini";
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Se încarcă...</div>
            </div>
        );
    }

    return <>{children}</>;
}
