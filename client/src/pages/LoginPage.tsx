import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export function LoginPage() {
    const handleMicrosoftLogin = () => {
        window.location.href = "/api/auth/microsoft";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

            <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/90 backdrop-blur">
                <CardHeader className="text-center pb-2">
                    {/* Logo */}
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
                        <Target className="h-9 w-9 text-primary-foreground" />
                    </div>

                    <CardTitle className="text-2xl font-bold text-white">
                        LRH Flow System
                    </CardTitle>

                    <CardDescription className="text-slate-400">
                        Organizational Control Platform
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Description */}
                    <p className="text-sm text-slate-300 text-center">
                        Sign in with your Microsoft account to access the CEO dashboard, manage tasks, and track organizational flow.
                    </p>

                    {/* Microsoft Sign In Button */}
                    <Button
                        onClick={handleMicrosoftLogin}
                        className="w-full h-12 bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white font-medium"
                    >
                        <svg className="h-5 w-5 mr-3" viewBox="0 0 21 21">
                            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                        </svg>
                        Sign in with Microsoft
                    </Button>

                    {/* Features list */}
                    <div className="pt-4 border-t border-slate-700">
                        <p className="text-xs text-slate-500 text-center mb-3">
                            Access includes:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                CEO Dashboard
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Ideal Scene
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Task Management
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Flow Control
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="absolute bottom-4 text-center text-xs text-slate-500">
                LRH-Compatible Organizational Control System
            </div>
        </div>
    );
}
