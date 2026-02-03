import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createParagraphNode, $getSelection, $isRangeSelection, ElementNode, FORMAT_TEXT_COMMAND, $isTextNode } from "lexical";
import {
    $createHeadingNode  } from "@lexical/rich-text";
import {
    $setBlocksType
} from "@lexical/selection"
import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND
  } from "@lexical/list";
import { BoldIcon, Heading1Icon, Heading2Icon, HeadingIcon, ItalicIcon, ListIcon, ListOrderedIcon, ListStartIcon, UnderlineIcon, XIcon, TypeIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { JSX } from "react";
import LinkDialog from "./LinkDialog";

type blockType = {
    label: JSX.Element,
    value: string,
    format: () => ElementNode
}

const blockTypes: blockType[] = [
    { label: <XIcon size={16} />, value: "remove-list", format: () => $createParagraphNode()},
    { label: <Heading1Icon size={16} />, value: "heading2", format: () => $createHeadingNode("h2") },
    { label: <Heading2Icon size={16} />, value: "heading3", format: () => $createHeadingNode("h3") }
]

const listTypes = [
    { label: <XIcon size={16} />, value: "remove-list", command: REMOVE_LIST_COMMAND},
    { label: <ListIcon size={16} />, value: "bullet-list", command: INSERT_UNORDERED_LIST_COMMAND },
    { label: <ListOrderedIcon size={16} />, value: "ordered-list", command: INSERT_ORDERED_LIST_COMMAND }
]

const fontSizes = [
    { label: "Small", value: "12px" },
    { label: "Normal", value: "14px" },
    { label: "Medium", value: "16px" },
    { label: "Large", value: "18px" },
    { label: "X-Large", value: "24px" },
    { label: "XX-Large", value: "32px" }
]

type Props = {
    "aria-label"?: string
}

const ToolBar:React.FC<Props> = (props) => {
    const [editor] = useLexicalComposerContext();

    const applyFontSize = (fontSize: string) => {
        editor.update(() => {
            const selection = $getSelection();
            
            if ($isRangeSelection(selection)) {
                selection.getNodes().forEach((node) => {
                    if ($isTextNode(node)) {
                        node.setStyle(`font-size: ${fontSize}`);
                    }
                });
            }
        });
    };

    return (
        <div className="flex flex-row" aria-label={props["aria-label"]}>
            <Button type="button" variant="ghost" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
                <BoldIcon size={12} />
            </Button>
            <Button type="button" variant="ghost" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
                <ItalicIcon size={12} />
            </Button>
            <Button type="button" variant="ghost" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}>
                <UnderlineIcon size={12} />
            </Button>
            <LinkDialog />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" title="Font Size">
                        <TypeIcon size={12}/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[120px]">
                    {fontSizes.map((fontSize) => {
                        return (
                            <DropdownMenuItem 
                                key={fontSize.value} 
                                onClick={() => applyFontSize(fontSize.value)}
                                className="cursor-pointer"
                            >
                                <span style={{ fontSize: fontSize.value }}>{fontSize.label}</span>
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost">
                        <HeadingIcon size={12}/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[50px] min-w-0">
                    {blockTypes.map((blockType) => {
                        return (
                            <DropdownMenuItem className="flex items-center justify-center w-[40px]" key={blockType.value} onClick={() => {
                                editor.update(() => {
                                    const selection = $getSelection();
                            
                                    if ($isRangeSelection(selection)) {
                                        $setBlocksType(selection, blockType.format);
                                    }
                                });
                            }}>
                                {blockType.label}
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost">
                        <ListStartIcon size={12} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[50px] min-w-0">
                    {listTypes.map((listType) => {
                        return (
                            <DropdownMenuItem className="flex items-center justify-center w-[40px]" key={listType.value} onClick={() => {
                                editor.update(() => {
                                    //@ts-expect-error List types do not need parameters
                                    editor.dispatchCommand(listType.command);
                                });
                            }}>
                                {listType.label}
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

export default ToolBar;