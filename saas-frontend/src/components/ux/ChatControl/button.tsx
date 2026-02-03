import { Button } from "@/components/ui/button";

export default function ChatToggleButton({
  onClick,
  label = "Customer Chat",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <Button variant="link" className={`text-sm ${className}`} onClick={onClick}>
      {label}
    </Button>
  );
}
