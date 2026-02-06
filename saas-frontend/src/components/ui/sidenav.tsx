import React, { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Button } from "./button";
import VisuallyHidden from "../ux/VisuallyHidden";

const sidebar_size = {
    width: 200
};

export type NavOption = {
    type?: "navgroup" | "navitem" | "divider";
    label: string;
    href?: string;
    icon?: JSX.Element;
    navOptions?: NavOption[];
    dialogId?: string;
    replaceNav?: boolean;
    className?: string;
    testId?: string;

    // Optional short description shown as subtitle on expandable groups
    // Overrides the auto-generated subtitle from child labels
    description?: string;

    // path is used to store the path to this nav option
    path?: string[];
};

type SideNavItemProps = {
    navOption: NavOption;
    depth: number;
    activePath: string[];
    commandLocation: "internal" | "external";
    path?: string[]
};

const SideNavItem: React.FC<SideNavItemProps> = ({ navOption, depth, activePath, commandLocation }) => {
    const [showSubNav, setShowSubNav] = useState(false);

    let action_type = "expand";
    if (navOption.dialogId) {
        action_type = "dialog";
    } else if (navOption.href) {
        action_type = "link";
    } else if (navOption.replaceNav) {
        action_type = "replace_nav";
    }

    const handleClick = () => {
        if (navOption.path == null) return;

        // if they are clicking the same nav item it should simply close the subnav and clear active state
        if (activePath.length == navOption.path.length && activePath.every((item, index) => navOption.path != null && item == navOption.path[index])) {
            setShowSubNav(!showSubNav);
            // Dispatch event to clear the active path
            const event = new CustomEvent("open-nav", {
                detail: {
                    path: [],
                    action: { type: "close" }
                }
            });
            window.dispatchEvent(event);
            return;
        }

        // raise custom event to open the nav
        // append this navOption Label to the event payload
        // this will be used to set the active path
        const event = new CustomEvent("open-nav", {
            detail: {
                path: navOption.path,
                action: {
                    type: action_type,
                    dialog: navOption.dialogId,
                    href: navOption.href
                }
            }
        });
        window.dispatchEvent(event);

        // we also need to expand the subnav if it exists
        if (navOption.navOptions) {
            setShowSubNav(!showSubNav);
        }
    };

    const subNavOptions = navOption.navOptions;

    // if the current path is not in the active path, then we should not show the subnav
    useEffect(() => {
        if (navOption.path == null) return;
        // need to check that all of the current path items are in the active path array
        const path = navOption.path;
        // now we can compare the path to the active path
        const show = path.every((item, index) => activePath[index] == item);
        if (showSubNav != show) {
            setShowSubNav(show);
        }
    }, [activePath]);

    // Highlight if this item's path is a prefix of the active path (highlights all parents in the chain)
    const isActive = activePath.length > 0 && navOption.path &&
        navOption.path.length <= activePath.length &&
        navOption.path.every((item, index) => activePath[index] === item);

    return (
        <li className="relative w-full p-2" role="none">
            <div className="w-full">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="flex flex-col"
                >
                    <Button
                        type="button"
                        aria-label={navOption.label}
                        aria-current={isActive ? "page" : undefined}
                        aria-expanded={subNavOptions ? showSubNav : undefined}
                        aria-haspopup={subNavOptions ? "menu" : undefined}
                        data-testid={navOption.testId}
                        className={cn(
                            "group flex flex-row justify-start w-full hover:bg-amber-500/10",
                            subNavOptions ? "h-16" : "h-10"
                        )}
                        onClick={handleClick}
                        variant="ghost"
                        role="menuitem"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleClick();
                            }
                        }}>
                        {navOption.icon && <div className="mr-4 w-6 flex items-center justify-center text-amber-400 group-hover:text-amber-300 transition-colors" aria-hidden="true">{navOption.icon}</div>}
                        <div className="flex flex-col items-start flex-grow min-w-0 space-y-1">
                            <span className={cn(
                                "transition-colors text-left",
                                isActive ? "text-amber-400" : "text-white/90 group-hover:text-white"
                            )}>{navOption.label}</span>
                            {subNavOptions && (
                                <p className="w-full text-slate-400 truncate pr-2">
                                {navOption.description || subNavOptions
                                    ?.filter((opt) => opt.type !== "divider" && opt.label)
                                    .map((opt) => opt.label.replace(/^New\s+/, ""))
                                    .join(", ")}
                                </p>
                            )}
                        </div>
                    </Button>
                </motion.div>
                {subNavOptions && showSubNav && (
                    <motion.div
                        className="absolute"
                        style={{ top: 0, transform: `translateX(${sidebar_size.width + 4}px)` }}
                    >
                        <SideNav
                            navOptions={subNavOptions}
                            depth={depth + 1}
                            activePath={activePath}
                            commandLocation={commandLocation}
                        />
                    </motion.div>
                )}
            </div>
        </li>
    );
};

type SideNavProps = {
    "aria-label"?: string;
    navOptions: NavOption[];
    depth?: number;
    activePath?: string[];
    className?: string;
    commandLocation: "internal" | "external";
};

const append_paths_to_nav = (navOptions: NavOption[], path: string[]) => {
    return navOptions.map((navOption) => {
        const tmp = navOption;
        tmp.path = [...path, navOption.label];
        if (navOption.navOptions) {
            append_paths_to_nav(navOption.navOptions, tmp.path);
        }
        return tmp;
    });
};

const SideNav: React.FC<SideNavProps> = ({ navOptions, depth = 1, activePath = [], className, commandLocation, ...rest }) => {
    // check if the navOptions have paths
    // if they do not have paths, we need to add them
    if (navOptions.some((navOption) => navOption.path == null)) {
        // this applies recursively so we assume it will only be called once at the top level
        navOptions = append_paths_to_nav(navOptions, []);
    }
    
    return (
        <>
            {/* Background layer for main sidebar only */}
            {depth === 1 && (
                <div className="fixed inset-y-0 left-0 w-[200px] overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
                    <div className="absolute inset-0 bg-slate-950" />
                    <motion.div
                        className="absolute inset-0"
                        animate={{
                            background: [
                                "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 40%)",
                                "radial-gradient(circle at 80% 40%, rgba(139, 92, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 20% 60%, rgba(59, 130, 246, 0.3) 0%, transparent 40%)",
                                "radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 40%)",
                                "radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 40%)",
                            ],
                        }}
                        transition={{
                            duration: 15,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </div>
            )}

            <motion.ul
                aria-label={rest["aria-label"]}
                className={cn(
                    "fixed py-1 drop-shadow-lg rounded-xl flex flex-col z-40 left-0",
                    depth === 1 ? "" : "bg-slate-950 border border-white/10 max-h-[calc(100vh-2rem)] overflow-y-auto",
                    className
                )}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: sidebar_size.width, opacity: 1 }}
                transition={{ duration: 0.2 }}
                role="menu"
            >
            {navOptions.map((navOption, index) => (
                <React.Fragment key={index}>
                    {navOption.type === "divider" ? (
                        navOption.label ? (
                            <div className="mt-3 mb-1 mx-3" role="separator">
                                <span className="text-[10px] text-amber-300/50 uppercase tracking-wider font-medium">{navOption.label}</span>
                            </div>
                        ) : (
                            <div className="my-2 mx-3 border-t border-slate-700" role="separator" />
                        )
                    ) : navOption.type === "navgroup" ? (
                        <>
                            <div className="text-sm pl-4 my-1 text-amber-300/70 text-left" role="presentation">{navOption.label}</div>
                            {navOption.navOptions != null && navOption.navOptions.map((item, itemIndex) => (
                                <SideNavItem
                                    key={itemIndex}
                                    navOption={item}
                                    depth={depth}
                                    activePath={activePath}
                                    commandLocation={commandLocation}
                                />
                            ))}
                        </>
                    ) : (
                        <SideNavItem
                            navOption={navOption}
                            depth={depth}
                            activePath={activePath}
                            commandLocation={commandLocation}
                        />
                    )}
                </React.Fragment>
            ))}
            </motion.ul>
        </>
    );
};


// we will have a root controller node who is responsible for:
// 1. listening for the open-nav event
// 2. setting the active path
// 3. launching a navigation action or dialog action
// 4. closing the nav when a dialog is opened
// 5. closing the nav when a dialog is closed
const RootControllerNode: React.FC<{
    "aria-label"?: string,
    navOptions: NavOption[],
    renderDialog: (dialogId: string, onClose: () => void) => JSX.Element,
    className?: string
}> = ({navOptions, renderDialog, className, ...rest}) => {
    const router = useRouter();
    const [activePath, setActivePath] = useState<string[]>([]);
    const [showDialog, setShowDialog] = useState<string | null>(null);
    const [commandLocation, setCommandLocation] = useState<"internal" | "external">("internal");

    useEffect(() => {
        const openNav = (e: CustomEvent) => {
            if (e.detail) {
                const { action, path } = e.detail;
                if (action.type == "dialog") {
                    setShowDialog(action.dialog);
                    // we also need to dispatch an event to close any navs
                    setActivePath([]);
                } else if (action.type == "link") {
                    setActivePath([]);
                    router.push(action.href);
                } else if (action.type == "replace_nav") {
                    setActivePath([]);
                } else if (action.type == "close") {
                    setActivePath([]);
                } else {
                    setActivePath(path);
                }
                setCommandLocation("internal");
            }
        }
        window.addEventListener("open-nav", openNav);
        return () => window.removeEventListener("open-nav", openNav);
    }, []);

    useEffect(() => {
        const openNav = (e: CustomEvent) => {
            if (e.detail) {
                const { action, path } = e.detail;
                if (action.type == "dialog") {
                    setShowDialog(action.dialog);
                    // we also need to dispatch an event to close any navs
                    setActivePath([]);
                } else if (action.type == "link") {
                    setActivePath([]);
                    router.push(action.href);
                } else if (action.type == "replace_nav") {
                    setActivePath([]);
                } else {
                    setActivePath(path);
                }
                setCommandLocation("external");
            }
        }
        window.addEventListener("open-nav-external", openNav);
        return () => window.removeEventListener("open-nav-external", openNav);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const sideNavElement = target.closest('[role="menu"]');
            const isClickInsideSidebar = sideNavElement !== null;

            if (!isClickInsideSidebar) {
                setActivePath([]);
            }
        };
        const handleCloseDialog = () => {
            setShowDialog(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("close-dialog", handleCloseDialog);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("close-dialog", handleCloseDialog);
        };
    }, []);

    const encoded_nav_options = append_paths_to_nav(navOptions, []);

    return (
        <>
            <SideNav 
                aria-label={rest["aria-label"]}
                className={className}
                navOptions={encoded_nav_options} 
                depth={1} 
                activePath={activePath}
                commandLocation={commandLocation} />
            <Dialog
                open={showDialog != null}
                onOpenChange={() => setShowDialog(null)}>
                <DialogContent
                    className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}>
                    <VisuallyHidden>
                        <DialogTitle>{activePath}</DialogTitle>
                    </VisuallyHidden>
                    {showDialog != null && renderDialog(showDialog, () => setShowDialog(null))}
                </DialogContent>
            </Dialog>
        </>
    );
}

export default RootControllerNode;