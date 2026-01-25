import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn, apiRequest } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import {
    LayoutDashboard,
    CheckSquare,
    Target,
    Building2,
    Calendar,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User,
    Sparkles,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
    href: string;
    label: string;
    icon: ReactNode;
    roles?: string[];
}

const navItems: NavItem[] = [
    { href: "/", label: "Panou de control", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/my-tasks", label: "Sarcinile mele", icon: <CheckSquare className="h-5 w-5" /> },
    { href: "/team-tasks", label: "Sarcinile echipei", icon: <Building2 className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/ideal-scene", label: "Stare ideală", icon: <Target className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/departments", label: "Departamente", icon: <Building2 className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/policies", label: "Politici", icon: <FileText className="h-5 w-5" />, roles: ["CEO"] },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
    { href: "/team-settings", label: "Setările echipei", icon: <Settings className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/settings", label: "Setări", icon: <Settings className="h-5 w-5" />, roles: ["CEO"] },
];

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [location] = useLocation();
    const { user, logout, hasRole } = useAuth();

    const visibleNavItems = navItems.filter(
        (item) => !item.roles || hasRole(...item.roles)
    );

    // Fetch main goal for mission banner
    const { data: mainGoals } = useQuery<Array<{ id: string; title: string; description: string | null }>>({
        queryKey: ["ideal-scene"],
        queryFn: () => apiRequest("/api/ideal-scene"),
    });
    const mainGoal = mainGoals?.[0];

    return (
        <div className="min-h-screen flex">
            {/* Premium Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen transition-all duration-300",
                    "bg-black/40 backdrop-blur-xl border-r border-white/5",
                    collapsed ? "w-20" : "w-72"
                )}
            >
                {/* Logo Area */}
                <div className="h-20 flex items-center justify-center px-4 border-b border-white/5">
                    {!collapsed ? (
                        <div className="flex items-center gap-3">
                            <img
                                src="/visoro-logo.png"
                                alt="Visoro Group"
                                className="h-12 w-12 rounded-full object-contain"
                            />
                            <div>
                                <span className="font-bold text-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                    Visoro Tasks
                                </span>
                                <div className="text-[10px] text-purple-300/60 font-medium tracking-wider">
                                    TASK MANAGER
                                </div>
                            </div>
                        </div>
                    ) : (
                        <img
                            src="/visoro-logo.png"
                            alt="Visoro Group"
                            className="h-11 w-11 rounded-full object-contain"
                        />
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1">
                    {visibleNavItems.map((item, index) => {
                        const isActive = location === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                                    isActive
                                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                                        : "text-white/60 hover:text-white hover:bg-white/5",
                                    collapsed && "justify-center px-3"
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <span className={cn(
                                    "transition-transform duration-300",
                                    isActive && "text-purple-400",
                                    "group-hover:scale-110"
                                )}>
                                    {item.icon}
                                </span>
                                {!collapsed && (
                                    <span className="transition-all duration-300">{item.label}</span>
                                )}
                                {isActive && !collapsed && (
                                    <Sparkles className="h-3 w-3 text-purple-400 ml-auto" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse toggle */}
                <div className="absolute bottom-6 left-0 right-0 px-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "w-full text-white/40 hover:text-white hover:bg-white/5 rounded-xl",
                            collapsed ? "justify-center" : "justify-start"
                        )}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <>
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                <span className="text-xs">Restrânge</span>
                            </>
                        )}
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300",
                    collapsed ? "ml-20" : "ml-72"
                )}
            >
                {/* Premium Header */}
                <header className="sticky top-0 z-30 h-20 border-b border-white/5 bg-black/20 backdrop-blur-xl">
                    <div className="flex h-full items-center justify-between px-8">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                {navItems.find((item) => item.href === location)?.label || "Panou"}
                            </h1>
                        </div>

                        {/* User profile */}
                        <div className="flex items-center gap-4">
                            {user && (
                                <>
                                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.name}
                                                className="h-9 w-9 rounded-lg ring-2 ring-purple-500/30"
                                            />
                                        ) : (
                                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                <User className="h-5 w-5 text-white" />
                                            </div>
                                        )}
                                        <div className="hidden sm:block">
                                            <div className="text-sm font-semibold text-white">{user.name}</div>
                                            <div className="text-xs text-purple-300/60">{user.role}</div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={logout}
                                        className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl px-4"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden sm:inline ml-2 text-xs">Deconectare</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Mission Banner - always visible */}
                {mainGoal && mainGoal.description && (
                    <div className="bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-pink-600/20 border-b border-purple-500/20 backdrop-blur-lg">
                        <div className="px-8 py-3 flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/20">
                                <Target className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Misiune</span>
                                <div className="text-sm font-medium text-white">
                                    {mainGoal.description}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Page content with fade-in animation */}
                <div className="p-8 animate-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
