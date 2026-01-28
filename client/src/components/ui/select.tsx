import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
    value: string;
    onValueChange: (value: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
}

function Select({ value = "", onValueChange = () => { }, children }: SelectProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
    ({ className, children, ...props }, ref) => {
        const context = React.useContext(SelectContext);

        return (
            <button
                type="button"
                ref={ref}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                onClick={() => context?.setOpen(!context.open)}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
        );
    }
);
SelectTrigger.displayName = "SelectTrigger";

interface SelectValueProps {
    placeholder?: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
    const context = React.useContext(SelectContext);

    // Find the label from children would be complex, so we just show value or placeholder
    return (
        <span className={cn(!context?.value && "text-muted-foreground")}>
            {context?.value || placeholder}
        </span>
    );
}

interface SelectContentProps {
    children: React.ReactNode;
}

function SelectContent({ children }: SelectContentProps) {
    const context = React.useContext(SelectContext);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                context?.setOpen(false);
            }
        }

        if (context?.open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [context?.open]);

    if (!context?.open) return null;

    return (
        <div
            ref={ref}
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md max-h-60 overflow-auto"
        >
            {children}
        </div>
    );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
    children: React.ReactNode;
}

function SelectItem({ value, children, className, ...props }: SelectItemProps) {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
        <div
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground",
                className
            )}
            onClick={() => {
                context?.onValueChange(value);
                context?.setOpen(false);
            }}
            {...props}
        >
            {children}
        </div>
    );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
