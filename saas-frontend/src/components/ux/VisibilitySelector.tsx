import { useEffect, useState } from "react";
import classNames from "classnames";
import EyeWithSlash from "@/icons/EyeWithSlash";
import { Eye } from "lucide-react";
import { VisibilityType } from "@/utils/spiriverse";

const VisibilitySelector: React.FC<{
    //forObject: recordref_type;
    className?: string;
    iconSize?: number;
    filledColor?: string;
    onSelect?: (visible: boolean) => void;
    value: VisibilityType;
    }> = (props) => {
    const [visible, setVisible] = useState<VisibilityType>(props.value)

    useEffect(() => {
        if (props.value != null) setVisible(props.value);
    }, [props.value])

    const eyeOpenClick = async () => {
        setVisible(VisibilityType.PUBLIC);
        if (props.onSelect) props.onSelect(true);
    }

    const eyeClosedClick = () => {
        setVisible(VisibilityType.PRIVATE);
        if (props.onSelect) props.onSelect(false);
    }

      return (
        <div className={classNames("flex flex-col", props.className)}>
            <div className="flex flex-row space-x-2">
                {visible == VisibilityType.PUBLIC ? 
                  <Eye
                    height={20}
                    onClick={eyeOpenClick} />
                  : 
                  <EyeWithSlash
                    height={20}
                    onClick={eyeClosedClick} />}
            </div>
            <span> {visible == VisibilityType.PUBLIC ? "Public" : "Private"} </span>
        </div>
    )
}

export default VisibilitySelector;