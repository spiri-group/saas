import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { z } from "zod";
import UseLocationForService from "../hooks/UseLocationForService";
import CapturePhone from "@/components/ux/CapturePhone";

type BLProps = {
    gql_conn: gql_conn_type
    merchantId: string
    scheduleId: string
}

type Props = BLProps & {
}

export type LocationSelector = z.infer<typeof LocationSelectorSchema>

export const LocationSelectorSchema = z.object({
    type: z.enum(["inPerson", "onlineMeeting", "phoneCall"]),
    phoneNumber: z.string().nullable(),
})

const useBL = (props: BLProps) => {

    const location = UseLocationForService(props.merchantId, props.scheduleId);

    return {
        location: {
            get: location.data
        }
    }
}

const LocationSelector : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    return (
        <>
            <FormLabel>Select location</FormLabel>
                <FormField 
                    name="location.type"
                    render={(typeField) => {
                        return (
                            <RadioGroup onValueChange={typeField.field.onChange} defaultValue={typeField.field.value} className="flex flex-col">
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="inPerson"/>
                                    <Label className="mr-2">{bl.location.get?.location.inPerson.place.formattedAddress}</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="onlineMeeting"/>
                                    <Label className="ml-2">Online Meeting</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="phoneCall"/>
                                    <Label className="ml-2">Phone Call</Label>
                                    <FormField
                                        name="location.phoneNumber"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <CapturePhone {...field} />
                                            </FormControl>
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </RadioGroup>
                        )
                    }}
                />
            </>
    )
}

export default LocationSelector;