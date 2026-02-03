import { cn } from "@/lib/utils";

const BouncingDots: React.FC<{ numberOfDots?: number, className?: string }> = ({ numberOfDots = 3, className }) => {
    return (
        <span className={cn("flex gap-1", className)}>
            {Array.from({ length: numberOfDots }).map((_, index) => (
                <span
                    key={index}
                    className="animate-bounce"
                    style={{ animationDelay: `${index * 150}ms` }}
                >
                    .
                </span>
            ))}
        </span>
    );
};

export default BouncingDots;
