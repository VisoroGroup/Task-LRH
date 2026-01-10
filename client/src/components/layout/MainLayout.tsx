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
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
    href: string;
    label: string;
    icon: ReactNode;
    roles?: string[];
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

    const visibleNavItems = navItems.filter(
        (item) => !item.roles || hasRole(...item.roles)
    );

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
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50" />
                                <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                                    <Target className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <span className="font-bold text-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                    LRH Flow
                                </span>
                                <div className="text-[10px] text-purple-300/60 font-medium tracking-wider">
                                    EXECUTIVE SYSTEM
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50" />
                            <div className="relative h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Target className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1">
                    {visibleNavItems.map((item, index) => {
                        const isActive = location === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <a
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
                                </a>
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
                                <span className="text-xs">Collapse</span>
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
                                {navItems.find((item) => item.href === location)?.label || "Dashboard"}
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
                                        <span className="hidden sm:inline ml-2 text-xs">Logout</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content with fade-in animation */}
                <div className="p-8 animate-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
