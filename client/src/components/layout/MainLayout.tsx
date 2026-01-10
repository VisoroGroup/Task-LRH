import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
    href: string;
    label: string;
    icon: ReactNode;
    roles?: string[]; // If undefined, all roles can access
}

const navItems: NavItem[] = [
    { href: "/", label: "CEO Dashboard", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/my-tasks", label: "My Tasks", icon: <CheckSquare className="h-5 w-5" /> },
    { href: "/ideal-scene", label: "Ideal Scene", icon: <Target className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/departments", label: "Departments", icon: <Building2 className="h-5 w-5" />, roles: ["CEO", "EXECUTIVE"] },
    { href: "/calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
    { href: "/settings", label: "Settings", icon: <Settings className="h-5 w-5" />, roles: ["CEO"] },
];

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [location] = useLocation();
    const { user, logout, hasRole } = useAuth();

    // Filter nav items based on user role
    const visibleNavItems = navItems.filter(
        (item) => !item.roles || hasRole(...item.roles)
    );

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                                <Target className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="font-semibold text-lg">LRH Flow</span>
                        </div>
                    )}
                    {collapsed && (
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
                            <Target className="h-5 w-5 text-primary-foreground" />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1">
                    {visibleNavItems.map((item) => {
                        const isActive = location === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <a
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                        collapsed && "justify-center"
                                    )}
                                >
                                    {item.icon}
                                    {!collapsed && <span>{item.label}</span>}
                                </a>
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse toggle */}
                <div className="absolute bottom-4 left-0 right-0 px-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn("w-full", collapsed ? "justify-center" : "justify-start")}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <>
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Collapse
                            </>
                        )}
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300",
                    collapsed ? "ml-16" : "ml-64"
                )}
            >
                {/* Top bar */}
                <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex h-full items-center justify-between px-6">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold">
                                {navItems.find((item) => item.href === location)?.label || "Dashboard"}
                            </h1>
                        </div>

                        {/* User profile & logout */}
                        <div className="flex items-center gap-3">
                            {user && (
                                <>
                                    <div className="flex items-center gap-2">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.name}
                                                className="h-8 w-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                        )}
                                        <div className="hidden sm:block">
                                            <div className="text-sm font-medium">{user.name}</div>
                                            <div className="text-xs text-muted-foreground">{user.role}</div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={logout}
                                        className="text-muted-foreground"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="hidden sm:inline ml-2">Logout</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
