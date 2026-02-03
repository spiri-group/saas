import { Button } from "@/components/ui/button";

export default function PaymentToggleButton({
  onClick,
  label = "Payment Details",
  className,
  disabled = false,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button 
      variant="link" 
      className={`text-sm ${className}`} 
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}