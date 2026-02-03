import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Input } from "../ui/input";
import { FormField, FormLabel } from "../ui/form";
import ColorPickerDropDown from "./ColorPickerDropDown";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bold, CircleSlash, CornerLeftDown, CornerLeftUp, CornerRightDown, CornerRightUp, Italic, Strikethrough, Underline } from "lucide-react";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CSSProperties, JSX, useEffect, useRef } from "react";
import { escape_key } from "@/lib/functions";
import { Button } from "../ui/button";
import ComboBox from "./ComboBox";

export const TopBottomLeftRightSchema = z.object({
    top: z.coerce.number().min(0).max(100),
    bottom: z.coerce.number().min(0).max(100),
    left: z.coerce.number().min(0).max(100),
    right: z.coerce.number().min(0).max(100)
})

export const TextFormatSchema = z.object({
    family: z.string(),
    size: z.union([
        z.literal("small"),
        z.literal("medium"),
        z.literal("large")
    ]),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    backgroundColor: z.union([z.string().regex(/^#[0-9a-f]{6}$/i), z.literal("transparent")]),
    bold: z.boolean(),
    italic: z.boolean(),
    alignment: z.enum(["left", "right", "center"]),
    decoration: z.enum(["none", "underline", "line-through"]),
    case: z.enum(["none", "upper", "lower", "name"]),
    margin: TopBottomLeftRightSchema,
    padding: TopBottomLeftRightSchema,
    withQuotes: z.boolean(),
    borderRadius: z.object({
        topLeft: z.coerce.number().min(0).max(100),
        topRight: z.coerce.number().min(0).max(100),
        bottomLeft: z.coerce.number().min(0).max(100),
        bottomRight: z.coerce.number().min(0).max(100)
    })
})

export const defaultTextFormat: TextFormatSchema = {
    family: "clean",
    size: "medium",
    color: "#ffffff",
    backgroundColor: "transparent",
    bold: false,
    italic: false,
    alignment: "left",
    decoration: "none",
    case: "none",
    margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    },
    padding: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    },
    withQuotes: false,
    borderRadius: {
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0
    }
}

export type TextFormatSchema = z.infer<typeof TextFormatSchema>

type TextFormatterInputProps = {
    className?: string
    defaultValue?: TextFormatSchema,
    onChange: (value: TextFormatSchema) => void,
    onComplete?: (value: TextFormatSchema) => void,
    onReset?: () => void
}

const available_font_keys = ["decorative", "script", "handwriting", "gothic", "mono"]

const TextFormatterInput = ({onChange, ...props}: TextFormatterInputProps) => {
    
    const { control, getValues } = useForm<TextFormatSchema>({
        resolver: zodResolver(TextFormatSchema),
        defaultValues: props.defaultValue ?? {}
    })

    const values = useWatch<TextFormatSchema>({ control });

    useEffect(() => {
        onChange(values as any)
    }, [values, onChange]); 

    return (
        <>
            <div className={cn("flex flex-row space-x-2", props.className)}>
                <div className="flex flex-col space-y-2">
                    <FormField
                        control={control}
                        name={`size`}
                        render={({ field }) => (
                            <div className="flex flex-row space-x-2 items-center">
                                <FormLabel className="flex-none w-20">Size</FormLabel>
                                <ComboBox
                                    {...field}
                                    value={field.value} 
                                    items={Object.keys(fontSizeMap)}
                                    onChange={(value) => {
                                        field.onChange(value);
                                    }}
                                />
                            </div>
                        )} />
                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            name={`color`}
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-row space-x-2 items-center">
                                    <FormLabel className="flex-none w-20">Color</FormLabel>
                                    <ColorPickerDropDown 
                                        className="flex-grow h-10"
                                        placeholder={"Colour"} 
                                        {...field} />
                                </div>
                            )} />
                        <FormField
                            name={`backgroundColor`}
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-row space-x-2 items-center">
                                    <FormLabel className="flex-none w-20">Background</FormLabel>
                                    <ColorPickerDropDown 
                                        className="flex-grow h-10"
                                        placeholder={" Select colour"} 
                                        {...field} />
                                </div>
                            )} />
                    </div>
                    <div className="flex flex-row">
                        <div className="flex flex-row space-x-2 items-center">
                            <FormLabel className="flex-none w-20">
                                Format
                            </FormLabel>
                            <ToggleGroup
                                value={["bold", "italic"].filter((value) => {
                                    const values = getValues() as TextFormatSchema
                                    const tf = (values as TextFormatSchema)
                                    return tf[value]
                                })}
                                onValueChange={(value) => {
                                    onChange({
                                        ...getValues(),
                                        bold: value.includes("bold"),
                                        italic: value.includes("italic")
                                    })
                                }}
                                className="flex-grow" type="multiple">
                                <ToggleGroupItem value="bold">
                                        <Bold className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="italic">
                                    <Italic className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                        <FormField 
                            name={`decoration`}
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-row space-x-2 items-center">
                                    <FormLabel className="">Decoration</FormLabel>
                                    <ToggleGroup 
                                        type="single"
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                        }}>
                                        <ToggleGroupItem value="none">
                                            <CircleSlash className="h-4 w-4" />
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="underline">
                                            <Underline className="h-4 w-4" />
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="line-through">
                                            <Strikethrough className="h-4 w-4" />
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                            )} />
                    </div>
                    <div className="flex flex-row">
                        <FormField
                            name={`family`}
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-row space-x-2 items-center mr-2">
                                    <FormLabel className="flex-none w-20">Font</FormLabel>
                                    <div
                                        className="flex-none w-[200px]">
                                        <ComboBox
                                            {...field}
                                            items={available_font_keys}
                                        />
                                    </div>
                                </div>
                            )} />
                        <FormField
                            name={`alignment`}
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-row space-x-2 items-center">
                                    <FormLabel className="">Align</FormLabel>
                                    <ToggleGroup 
                                        value={field.value}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                        }}
                                        type="single" >
                                        <ToggleGroupItem value="left">
                                            <AlignLeft className="h-4 w-4" />
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="center">
                                            <AlignCenter className="h-4 w-4" />
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value="right">
                                            <AlignRight className="h-4 w-4" />
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                            )} />
                    </div>
                    <div className="flex flex-row space-x-3">
                        <span className="flex-none w-20">Margin</span>
                        <div className="grid grid-cols-2 grid-rows-2 gap-2">
                            <FormField
                                name={`margin.top`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <Input {...field} type="number" />
                                        <FormLabel className="">
                                            <ArrowUp className="w-4 h-4" />
                                        </FormLabel>
                                    </div>
                                )} />
                            <FormField
                                name={`margin.bottom`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <FormLabel className="">
                                            <ArrowDown className="w-4 h-4" />
                                        </FormLabel>
                                        <Input {...field} type="number" />
                                    </div>
                                )} />
                            <FormField
                                name={`margin.left`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <Input {...field} type="number" />
                                        <FormLabel className="">
                                            <ArrowLeft className="w-4 h-4" />
                                        </FormLabel>
                                    </div>
                                )} />
                            <FormField
                                name={`margin.right`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <FormLabel className="">
                                            <ArrowRight className="w-4 h-4" />
                                        </FormLabel>
                                        <Input {...field} type="number" />
                                    </div>
                                )} />
                        </div>
                    </div>
                    <div className="flex flex-row space-x-3">
                        <span className="flex-none w-20">Padding</span>
                        <div className="grid grid-cols-2 grid-rows-2 gap-2">
                            <FormField
                                name={`padding.top`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <Input {...field} type="number" />
                                        <FormLabel className="">
                                            <ArrowUp className="w-4 h-4" />
                                        </FormLabel>
                                    </div>
                                )} />
                            <FormField
                                name={`padding.bottom`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <FormLabel className="">
                                            <ArrowDown className="w-4 h-4" />
                                        </FormLabel>
                                        <Input {...field} type="number" />
                                    </div>
                                )} />
                            <FormField
                                name={`padding.left`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <Input {...field} type="number" />
                                        <FormLabel className="">
                                            <ArrowLeft className="w-4 h-4" />
                                        </FormLabel>
                                    </div>
                                )} />
                            <FormField
                                name={`padding.right`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <FormLabel className="">
                                            <ArrowRight className="w-4 h-4" />
                                        </FormLabel>
                                        <Input {...field} type="number" />
                                    </div>
                                )} />
                        </div>
                    </div>
                    <div className="flex flex-row space-x-3">
                        <span className="flex-none text-wrap w-20">Border radius</span>
                        <div className="grid grid-cols-2 grid-rows-2 gap-2">
                            <FormField
                                name={`borderRadius.topLeft`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">                                        
                                        <Input {...field} type="number" />
                                        <FormLabel className="">
                                            <CornerLeftDown className="w-4 h-4" />
                                        </FormLabel>
                                    </div>
                                )} />
                            <FormField
                                name={`borderRadius.topRight`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <FormLabel className="">
                                            <CornerRightDown className="w-4 h-4" />
                                        </FormLabel>
                                        <Input {...field} type="number" />
                                    </div>
                                )} />
                            <FormField
                                name={`borderRadius.bottomLeft`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">                                        
                                        <Input {...field} type="number" />
                                        <FormLabel className="">
                                            <CornerLeftUp className="w-4 h-4" />
                                        </FormLabel>
                                    </div>
                                )} />
                            <FormField
                                name={`borderRadius.bottomRight`}
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-row space-x-2 items-center">
                                        <FormLabel className="">
                                            <CornerRightUp className="w-4 h-4" />
                                        </FormLabel>
                                        <Input {...field} type="number" />
                                    </div>
                                )} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 grid-rows-1 mt-3">
                        <Button variant="link" onClick={() => {
                            if (props.onReset) props.onReset()
                            escape_key()
                        }}>Cancel</Button>
                        <Button variant="default" onClick={() => {
                            if (props.onComplete) props.onComplete(getValues())
                            escape_key()
                        }}>Confirm</Button>
                    </div>
                </div>
            </div>         
        </>
    )
}

const fontSizeMap = {
    small: 'clamp(0.75rem, 0.7vw + 0.3rem, 0.875rem)',   // ~12px–14px (adjusted)
    medium: 'clamp(0.875rem, 0.9vw + 0.4rem, 1.125rem)', // ~14px–18px
    large: 'clamp(1rem, 1vw + 0.5rem, 1.5rem)',          // ~16px–24px
    "extra large": 'clamp(1.25rem, 1.2vw + 0.6rem, 2rem)',  // ~20px–32px
};

export const TextWithFormat: React.FC<{  content: string | JSX.Element, format: TextFormatSchema, className?: string, style?: CSSProperties, }> = (props) => {

    const format = props.format
    const containerRef = useRef<HTMLDivElement>(null);
    
    return (
        <div 
            ref={containerRef}
            className={cn(props.className, `font-${format.family}`)}
            style={{
                ...props.style,
                ...{
                backgroundColor: format.backgroundColor,
                margin: `${format.margin.top}px ${format.margin.right}px ${format.margin.bottom}px ${format.margin.left}px`,
                padding: `${format.padding.top}px ${format.padding.right}px ${format.padding.bottom}px ${format.padding.left}px`,
                borderTopLeftRadius: `${format.borderRadius.topLeft}px`,
                borderTopRightRadius: `${format.borderRadius.topRight}px`,
                borderBottomLeftRadius: `${format.borderRadius.bottomLeft}px`,
                borderBottomRightRadius: `${format.borderRadius.bottomRight}px`
                }
            }}>
                <div style={{
                fontSize: fontSizeMap[format.size],
                fontWeight: format.bold ? "bold" : "normal",
                fontStyle: format.italic ? "italic" : "normal",
                width: '100%', 
                height: '100%',
                color: format.color,
                textDecoration: format.decoration,
                textAlign: format.alignment,
                overflow: "hidden"
            }}>
                {props.content}
            </div>
        </div>
    )
}

export default TextFormatterInput;