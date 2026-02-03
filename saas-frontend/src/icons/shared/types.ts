import { JSX } from "react";

export interface IconProps {
    mode?: IconStyle,
    label?: string,
    labelPosition?: string,
    height: number,
    hover?: boolean,
    className?: string,
    fillVariant?: "primary" | "accent",
    textColor?: string,
    hoverOpacity?: number,
    onMouseEnter?: () => void,
    onMouseLeave?: () => void,
    onClick?: () => void
}

export enum IconStyle {
    Fill = "solid",
    Outline = "outline"
}

export enum IconDirection {
    Up = "up",
    Down = "down",
    Left = "left",
    Right = "right"
}

export enum LabelPosition {
    Top = "top",
    Bottom = "bottom",
    Left = "left",
    Right = "right"
}

export type BaseIconProps = IconProps & {
    viewBox: string;
    onClick?: () => void;
    children: (props: IconProps) => JSX.Element[] | JSX.Element;
};


