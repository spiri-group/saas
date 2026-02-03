import classNames from 'classnames';
import React, { useState, useCallback } from 'react';
import { BaseIconProps, LabelPosition } from './types';

const BaseIcon: React.FC<BaseIconProps> = ({
    children, 
    viewBox, 
    label, 
    textColor = "primary",
    labelPosition = LabelPosition.Bottom,
    ...props}) => {
    const [hover, setHover] = useState(false);

    const handleMouseEnter = useCallback(() => {
        if (props.onMouseEnter) props.onMouseEnter();
        setHover(true);
    }, [props]);

    const handleMouseLeave = useCallback(() => {
        if (props.onMouseLeave) props.onMouseLeave();
        setHover(false);
    }, [props]);

    const viewBoxValues = viewBox.split(' ');
    const viewBoxWidth = parseInt(viewBoxValues[2]);
    const viewBoxHeight = parseInt(viewBoxValues[3]);
    const aspectRatio = viewBoxWidth / viewBoxHeight;
    const width = props.height * aspectRatio;

    // we need to align the label based on the position
    const svgContent = 
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={props.height} 
            viewBox={viewBox}>
            {children({...props, label, labelPosition, hover })}
        </svg>

    const labelContent = label == null ? null :
        <span className={`text-${textColor}`}>{label}</span>

    return (
        <div 
            onClick={props.onClick} 
            className={classNames("flex", labelPosition == "top" || labelPosition == "bottom" ? "flex-col space-y-3" : "flex-row space-x-3", "items-center", props.onClick != null ? "cursor-pointer" : null, props.className)}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            { labelPosition == "top" || labelPosition == "left" ? labelContent : null }
            {svgContent}
            { labelPosition == "bottom" || labelPosition == "right" ? labelContent : null }
        </div>
    );
};

export default BaseIcon;