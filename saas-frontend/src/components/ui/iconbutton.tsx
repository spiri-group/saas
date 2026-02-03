import { ButtonProps, buttonVariants } from './button'
import { cn } from '@/lib/utils';

export type IconButtonProps = ButtonProps & {
    icon: React.ReactNode,
    iconClassName?: string,
}

const IconButton = ({className, iconClassName, variant, size, ...props}: IconButtonProps) => {
    return (
        <button 
            {...props}
            className={cn("group", buttonVariants({ variant, size }), className)} 
            onClick={props.onClick}
            >
            {props.icon != null && <div className={iconClassName}>{props.icon}</div> }
            {props.children != null && <span className="ml-2">{props.children}</span>}
        </button>
    )
}

export default IconButton;