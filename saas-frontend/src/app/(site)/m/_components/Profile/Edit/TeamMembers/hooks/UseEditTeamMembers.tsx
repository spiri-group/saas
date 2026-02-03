import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { teamMemberSchema } from "../components/AddTeamMembers";
import UseVendorTeamMembers from "../../_hooks/UseVendorTeamMembers";
import { useEffect } from "react";
import { teamMember_type } from "@/utils/spiriverse";
import { prepObjectsWithImages } from "@/lib/functions";
import { useRef } from "react";

export type updateVendor_type = z.infer<typeof updateTeamMemberSchema>

const updateTeamMemberSchema = z.object({
    id: z.string().min(1),
    teamMembers: z.array(teamMemberSchema)
})

const UseEditTeamMembers = (merchantId: string) => {
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof updateTeamMemberSchema>>({
        resolver: zodResolver(updateTeamMemberSchema),
        defaultValues: {
            id: merchantId
        }
    })
    const formRef = useRef(form)

    const { data: teamMembers } = UseVendorTeamMembers(merchantId)
    
    useEffect(() => {
        if (teamMembers != null) {
            formRef.current.reset({
                id: merchantId,
                teamMembers: teamMembers
            })
        }
    }, [teamMembers, merchantId])

    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: updateVendor_type) => {

                const prepped_TeamMembers = prepObjectsWithImages(values.teamMembers, "image")

                const response = await gql<{ update_teamMembers: { teamMembers: teamMember_type[] } }>(
                    `mutation update_teamMembers($merchantId: ID!, $teamMembers: [TeamMemberUpdateInput]!) { 
                        update_teamMembers(merchantId: $merchantId, teamMembers: $teamMembers) {
                            teamMembers {
                                id,
                                name,
                                tagline,
                                bio,
                                image {
                                    url,
                                    urlRelative,
                                    name,
                                    size,
                                    type
                                }
                            }
                        }
                    }
                    `,
                    {
                        merchantId,
                        teamMembers: prepped_TeamMembers
                    }
                )
                return response.update_teamMembers.teamMembers;
            },
            onSuccess: (data: teamMember_type[]) => {
                // we need to update the cache
                queryClient.setQueryData(["teamMembers-for-merchant", merchantId], data)
            }
        })
    }
}

export default UseEditTeamMembers