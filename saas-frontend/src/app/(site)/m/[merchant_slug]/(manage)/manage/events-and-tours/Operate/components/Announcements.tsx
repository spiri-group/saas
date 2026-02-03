'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Panel } from "@/components/ux/Panel"
import React, {  } from "react"

const AnnouncementsComponent : React.FC = () => {

    return (   
        <>
            <div className="grid grid-cols-2 space-x-2"> 
                <Panel>
                    <h1 className="text-xl font-bold"> Create New Announcement </h1>
                    <RadioGroup defaultValue="comfortable" className="flex flex-row">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="default" id="r1" />
                            <Label htmlFor="r1">Post Now</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="comfortable" id="r2" />
                            <Label htmlFor="r2">Schedule</Label>
                        </div>
                    </RadioGroup>
                    {/* {visible &&
                        <div className="flex flex-row ">
                            <Input className="input" type="number" placeholder="Time" onChange={(ev) => bl.selectedTime.set(parseFloat(ev.target.value.toString()))} />
                            <ComboBox
                                className="mt-4 flex-grow"
                                value={bl.unit.set.selectedUnit} 
                                inputClassName="input" 
                                mode={ComboBoxMode.Standard} 
                                labelField={"defaultLabel"} 
                                placeHolder={"Select Unit"} 
                                items={bl.unit.get.unitOptions} 
                                onSelect={bl.unit.set.selectedUnit} />
                            <ComboBox 
                                className="mt-4 flex-grow"
                                mode={ComboBoxMode.Standard} 
                                value={bl.timeFrame.set.selectedTimeFrame}
                                labelField={"defaultLabel"}
                                placeHolder="Select Time Frame"
                                items={bl.timeFrame.get.timeFrameOptions}
                                onSelect={bl.timeFrame.set.selectedTimeFrame}
                            />
                            <ComboBox
                                className="mt-4 flex-grow"
                                mode={ComboBoxMode.Search}
                                value={bl.activity.set.selectedActivity}
                                items={bl.activity.get.options}
                                labelField={"name"}
                                onSelect={bl.activity.set.selectedActivity}
                                placeHolder="Choose activity"
                            />
                        </div>
                    } */}
                    <div className="flex flex-row mt-2">
                        <h1> Message </h1>
                        <Textarea placeholder="Type your message here." className="ml-2"/>
                    </div>
                    <Button className="mt-2"> Create Announcement </Button>
                </Panel>
                <Panel>
                    <h1 className="text-xl font-bold"> All announcement appears here </h1>
                    {/* {bl.bookings.get.map((announcement) => {
                        return (
                            <div className="flex flex-row space-x-2">
                                <span> {announcement.datetime.toLocaleString(DateTime.DATETIME_MED)} </span>
                                <span> {announcement.unit} </span>
                                <span> {announcement.timeFrame} </span>
                                <span> {announcement.message} </span>
                            </div>
                        )
                    })} */}
                </Panel>
            </div>
        </>
    )
}

export default AnnouncementsComponent;