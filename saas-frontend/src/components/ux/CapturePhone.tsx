import { ControllerRenderProps } from "react-hook-form"
import PhoneInput from 'react-phone-number-input';
import classNames from "classnames";
import 'react-phone-number-input/style.css';
import { Country } from "react-phone-number-input";

type Props = ControllerRenderProps<any> & {
    className?: string,
    defaultCountry?: Country | null
}

const CapturePhone : React.FC<Props> = (props) => {
    return (
        <PhoneInput
            className={classNames(props.className, "p-2 border border-slate-200 hover:border-slate-400 focus:border-2 focus:border-primary focus:outline-none rounded-lg")}
            value={props.value}
            defaultCountry={props.defaultCountry ?? "AU"}
            onChange={(value?) => {
                if (value != null) {
                    props.onChange(value);
                }
            } } />
    )
}

export default CapturePhone;