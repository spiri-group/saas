import { cn } from "@/lib/utils";
import { CSSProperties, ReactNode } from "react";

const PanelHeader: React.FC<
{children: ReactNode}
& React.HTMLAttributes<HTMLDivElement>> = ({className, children, ...props}) => {
    return (
        <div {...props} className={cn("mb-2", className)}>
            {children}
        </div>
    )
}
PanelHeader.displayName = "Panel Header"

const PanelTitle : React.FC<
{children: ReactNode, as?: 'h1' | 'h2'}
& React.HTMLAttributes<HTMLHeadingElement>
> = ({ children, as, className, ...props}) => {
    if (as === 'h1') {
        return (
            <h1 {...props} className={cn("text-lg font-bold", className)}>
                {children}
            </h1>
        );
    }
    return (
        <h2 className={cn("text-lg font-bold", className)}>
            {children}
        </h2>
    );
}
PanelTitle.displayName = "Panel Title"

const PanelDescription : React.FC<{children: ReactNode, className?: string}> = (props) => {
    return (
        <h2 
            className={cn("text-md text-muted-foreground", props.className)}>
            {props.children}
        </h2>
    )
}
PanelDescription.displayName = "Panel Description"

const PanelContent: React.FC<{children: ReactNode, className?:string}> = (props) => {
    return (
        <div className={cn("", props.className)}>
            {props.children}
        </div>
    )
}

const Panel: React.FC<{id?: string, children?: ReactNode, className?: string, style?: CSSProperties}> = (props) => {
    return (
        <div id={props.id} style={{...props.style}} className={cn("rounded-xl bg-panel text-panel-foreground border border-slate-100 p-3 drop-shadow-lg ", props.className)}>
           {props.children}
        </div>
    )
} 

export { Panel, PanelHeader, PanelContent, PanelTitle, PanelDescription };