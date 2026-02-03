import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"
import { Input } from "../ui/input"
import React from "react"
import { Button } from "../ui/button"

type Props = {
    className?: string;
    placeholder: string;
    id?: string;
    value: string | undefined;
    onChange: (value: string | undefined) => void; // Replaced react-hook-form dependency with a standard onChange prop
    onRemove?: () => void; // Optional remove function
};

const ColorPickerDropDown: React.FC<Props> = ({ className, placeholder, id, value, onChange, onRemove }) => {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [oldColor, setOldColor] = React.useState<string | undefined>(value);
    const [cancelled, setCancelled] = React.useState<boolean>(false);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setCancelled(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(isOpen) => {
                if (isOpen) {
                    setOldColor(value);
                    setCancelled(false);
                } else if (!isOpen && cancelled && value !== oldColor) {
                    onChange(oldColor);
                }
            }}
        >
            <PopoverTrigger className={cn(className)}>
                <div
                    id={id}
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(`flex items-center justify-center border border-gray-200 rounded-md h-full w-full cursor-pointer`)}
                    style={{ backgroundColor: value }}
                >
                    {value == null && <span className="text-gray-400">{placeholder}</span>}
                </div>
            </PopoverTrigger>
            <PopoverContent className="flex flex-col items-center space-y-3">
                <HexColorPicker
                    style={{ width: '100%' }}
                    color={value}
                    onChange={(newColor) => {
                        onChange(newColor);
                    }}
                />
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <div className="flex flex-row space-x-2 w-full">
                    {
                        onRemove && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    setCancelled(true);
                                    setIsOpen(false);
                                    onRemove();
                                }}
                            >
                                Remove Color
                            </Button>
                        )
                    }
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                            setCancelled(true);
                            setIsOpen(false);
                            onChange(oldColor);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-grow"
                        type="button"
                        variant="default"
                        onClick={() => {
                            setIsOpen(false);
                        }}
                    >
                        Confirm
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ColorPickerDropDown