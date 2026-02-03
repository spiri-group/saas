'use client'

import { useCallback, useEffect, useState } from "react"
import { Input, InputProps } from "../ui/input"
import { ControllerRenderProps } from "react-hook-form"
import { cn } from "@/lib/utils"

type HashTagInputControlProps =  ControllerRenderProps<{
    [key: string]: string[]
  }, any> & InputProps & {
}

type HashTagInputProps = HashTagInputControlProps & {
    withPreview? : boolean,
    seperators?: string[],
    encodeTagFn?: (tag: string) => string
}


const HashTagInput = ({ 
    className, 
    withPreview = false, 
    encodeTagFn = (tag: string) => tag,
    seperators = [",", " ", "#"],
    ...props}: HashTagInputProps) => {
    const [input, setInput] = useState<string>("")
    const [, setTags] = useState<string[]>([])

    const genTags = useCallback((value: string) => {
        const regexPattern = new RegExp(`[${seperators.join("")}]`, "g")
        let hashtags = value.split(regexPattern).filter((s) => s.length > 0)
        hashtags = Array.from(new Set(hashtags.map((s) => encodeTagFn(s.trim()))))
        return hashtags
    }, [encodeTagFn, seperators])

    useEffect(() => {
        // you need to check if the genTags is different from the current value
        const oldTags = genTags(input)
        const newTags = props.value
        if (oldTags.join(" ") !== newTags.join(" ")) {
            setInput(newTags.join(" "))
            setTags(newTags)
        }
    }, [props.value, genTags, input])

    const InputControl = 
        (
            <Input 
                className="flex-none"
                {...props}
                value={input}
                onChange={(ev) => {
                    setInput(ev.target.value)
                    const hashtags = genTags(ev.target.value)
                    props.onChange(hashtags)
                }} />
        )

    if (withPreview) {
        return (
            <div className={cn("flex flex-col", className)}>
                {InputControl}
                <div className="mt-3 flex flex-row flex-wrap overflow-y-auto">
                    {props.value.map((tag, index) => {
                        return (
                            <div 
                                key={index}
                                title={tag}  
                                aria-label={`Hashtag: ${tag}`}
                                className="h-10 m-1 bg-gray-100 rounded-xl p-2 truncate">
                                {tag}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    } else {
        return InputControl
    }
}

export default HashTagInput