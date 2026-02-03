'use client';

import classNames from "classnames";
import { JSX, useState } from "react";

type WordNavParams<T> = {
    className?: string,
    buttonClassName?: string,
    options: (T|string)[],
    field?: string,
    onChange?: (selected:T|string) => void
}

const WordNav: <T>(p: WordNavParams<T>) => JSX.Element = (props) => {
    const [selected_option, setSelectedOption] = useState(props.options[0]);

    return (
        <ul className={props.className}>
        {
            props.options.map(
                (option)=>{
                let label = "";
                if (typeof(option) != typeof("")) {
                    if (props.field == null) throw "You must pass a field"
                    const item: any = option;
                    label = item[props.field]
                } else {
                    label = option as string
                } 
                return (
                    <button type="button" key={label} onClick={(ev) => {
                        ev.preventDefault()
                        setSelectedOption(option)
                        if (props.onChange) props.onChange(option)
                    }} className={classNames("mr-2" , props.buttonClassName, selected_option == option ? "text-black font-bold" : "text-slate-400 ")}>{label}</button>  
                )
                }
            )
        }
        </ul>
    )
    
}

export default WordNav;