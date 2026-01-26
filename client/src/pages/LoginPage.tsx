import { Button } from "@/components/ui/button";
import { LogIn, Sparkles, Shield, BarChart3, Zap } from "lucide-react";

export function LoginPage() {
    const handleLogin = () => {
        window.location.href = "/api/auth/microsoft";
    };

    return (
        <div className="login-container">
            {/* Animated orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            <div className="login-card relative z-10">
                {/* Logo & Title */}
                <div className="text-center mb-10">
                    <img
                        src="/visoro-logo.png"
                        alt="Visoro Group"
                        className="w-24 h-24 mx-auto mb-6 rounded-full object-contain shadow-lg"
                    />
                    <h1 className="text-4xl font-bold login-title mb-2">
                        Visoro Task Manager
                    </h1>
                    <p className="text-muted-foreground">
                        Executive Management Platform
                    </p>
                </div>

                {/* Login Button */}
                <Button
                    onClick={handleLogin}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]"
                >
                    <LogIn className="mr-3 h-5 w-5" />
                    Conectare cu Microsoft
                </Button>

                {/* Divider */}
                <div className="flex items-center my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <Sparkles className="mx-4 h-4 w-4 text-purple-400" />
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* Features */}
                <div className="space-y-4">
                    <Feature
                        icon={<Shield className="h-5 w-5" />}
                        title="Acces pe bază de rol"
                        description="CEO, executiv și permisiuni utilizator"
                        gradient="from-green-400 to-emerald-500"
                    />
                    <Feature
                        icon={<BarChart3 className="h-5 w-5" />}
                        title="Tablou de bord în timp real"
                        description="Urmărește sarcinile, fluxul și KPI"
                        gradient="from-blue-400 to-cyan-500"
                    />
                    <Feature
                        icon={<Zap className="h-5 w-5" />}
                        title="Gestionarea obiectivelor"
                        description="Imaginea ideală - gestionarea ierarhiei"
                        gradient="from-yellow-400 to-orange-500"
                    />
                </div>

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-muted-foreground">
                        Powered by <span className="gradient-text font-semibold">VisoroGroup</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, title, description, gradient }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
}) {
    return (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div>
                <div className="font-medium text-sm">{title}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
            </div>
        </div>
    );
}
