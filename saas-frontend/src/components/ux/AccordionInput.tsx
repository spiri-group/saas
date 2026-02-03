'use client'

import React from "react";
import { ControllerRenderProps, Form, useForm } from "react-hook-form";
import { z } from "zod";
import { Button, ButtonProps } from "../ui/button";
import { FormLabel, FormField, FormItem, FormControl } from "../ui/form";
import { Input } from "../ui/input";
import RichTextInput from "./RichTextInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";
import { Pencil, Trash } from "lucide-react";
import { v4 as uuid } from "uuid";
import { Panel } from "./Panel";
import CancelDialogButton from "./CancelDialogButton";
import { escape_key } from "@/lib/functions";

export type accordionItem_type = z.infer<typeof accordionItemSchema>

export const accordionItemSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1)
})

type Props = ControllerRenderProps<{
  [key: string]: accordionItem_type[]
}, any> & {
  placeholders?: {
    title?: string,
    description?: string
  },
  titleProps?: {
    className?: string
  },
  contentProps?: {
    className?: string
  },
  createButtonProps?: ButtonProps & {label: string},
  editButtonProps?: ButtonProps & {label: string}
}

type AccordionItemInputProps = {
  onComplete: (accordionItem: accordionItem_type) => void,
  initialData?: accordionItem_type,
  placeholders?: {
    title?: string,
    description?: string
  }
}

const useAccordionItemBL = (props: AccordionItemInputProps) => {
    const form = useForm<accordionItem_type>({
      resolver: zodResolver(accordionItemSchema),
      defaultValues: props.initialData ?? {id: uuid()} 
    })

    return {
        form,
        submit: async (values: accordionItem_type) => {
          await props.onComplete(values)
          escape_key()
      }
    }
}

const AccordionItemInput : React.FC<AccordionItemInputProps> = (props) => {
  const bl = useAccordionItemBL(props)

    return (
      <Panel>
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col space-y-3 p-2">
                  <div className="flex flex-col space-y-3">
                    <FormLabel>Title</FormLabel>
                    <FormField
                      name="title"
                      control={bl.form.control}
                      render={({ field }) => (
                          <FormItem className="flex-grow mx-2">
                              <FormControl>
                                  <Input {...field} value={field.value ?? ""} placeholder={props.placeholders?.title} />
                              </FormControl>
                          </FormItem>
                      )} />
                  </div>
                  <FormField
                      name="description"
                      control={bl.form.control}
                      render={({ field }) => (
                          <RichTextInput 
                            label="Description" {...field} 
                            className="flex-grow mx-2 h-[200px]"
                            placeholder={props.placeholders?.description} />
                    )} />
                <div className="flex flex-row space-x-2 mt-auto">
                    <CancelDialogButton />
                    <Button type="submit" onClick={bl.form.handleSubmit(bl.submit)} className="flex-grow">Confirm</Button>
                </div>
            </form>
        </Form>
      </Panel>
    )
}

const AccordionInput : React.FC<Props> = (props) => {
  
    return (
      <>   
        <Popover>
          <PopoverTrigger>
            <Button type="button" {...props.createButtonProps}> {props.createButtonProps ? props.createButtonProps.label : "Add"} </Button>
          </PopoverTrigger>
          <PopoverContent>
            <AccordionItemInput onComplete={(value) => {
              if (props.value) {
                props.onChange([value, ...props.value])
              } else {
                props.onChange([value])
              }
            }}/>
          </PopoverContent>
        </Popover>
        { props.value && props.value.map((item) => {
          return (
            <Accordion key={`accordianitem-${item.id}`} type="single" collapsible>
                <AccordionItem value="items">
                    <div className="flex flex-row items-center w-full">
                      <Button type="button" variant="link" 
                      onClick={() => {
                        const index = props.value.findIndex((i) => i.id === item.id)
                        if (index == -1) throw new Error(`Item id ${item.id} not found in form field ${props.name}`)
                        const newValue = [...props.value]
                        newValue.splice(index, 1)
                        props.onChange(newValue)
                      }}><Trash height={14}/></Button>
                      <Popover>
                          <PopoverTrigger>
                              <Button type="button" variant="link" {...props.editButtonProps}> <Pencil height={14}/> </Button>
                          </PopoverTrigger>
                          <PopoverContent className="flex-none w-[500px] p-2">
                              <AccordionItemInput 
                              initialData={item}
                              onComplete={(value) => {
                                  // check the location of value in props.value and replace it
                                  const index = props.value.findIndex((i) => i.id === value.id)
                                  if (index == -1) throw new Error(`Item id ${value.id} not found in form field ${props.name}`)
                                  const newValue = [...props.value]
                                  newValue[index] = value
                                  props.onChange(newValue)
                              }} 
                              />
                          </PopoverContent>
                      </Popover>
                      <AccordionTrigger>
                          <span {...(props.titleProps ? props.titleProps : { className: "font-bold"})}>{item.title}</span>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent> 
                      <p {...(props.contentProps ? props.contentProps : { className:"leading-6" })} 
                         dangerouslySetInnerHTML={{ __html: item.description }} /> 
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          )
        })
        }
      </>
    )
}
  
export default AccordionInput;