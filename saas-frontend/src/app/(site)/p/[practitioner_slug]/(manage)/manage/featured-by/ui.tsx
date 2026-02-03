'use client'

import React, { useState } from "react"
import { Session } from "next-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Store, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import {
    usePractitionerFeaturingRelationships,
    usePendingFeaturingRequests,
    FeaturingRelationship
} from "./hooks/UsePractitionerFeaturingRelationships"
import {
    useRespondToFeaturingRequest,
    useTerminateFeaturingRelationship
} from "./hooks/UseRespondToFeaturingRequest"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

const statusConfig = {
    PENDING: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
    ACCEPTED: { label: "Active", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
    REJECTED: { label: "Rejected", color: "bg-red-500/20 text-red-400", icon: XCircle },
    EXPIRED: { label: "Expired", color: "bg-gray-500/20 text-gray-400", icon: Clock },
    TERMINATED: { label: "Terminated", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const ActiveRelationshipCard = ({
    relationship,
    onTerminate
}: {
    relationship: FeaturingRelationship;
    onTerminate: (id: string) => void;
}) => {
    const status = statusConfig[relationship.requestStatus];
    const StatusIcon = status.icon;
    const yourSharePercent = (relationship.practitionerRevenueShareBps / 100).toFixed(1);
    const merchantSharePercent = (relationship.merchantRevenueShareBps / 100).toFixed(1);

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={relationship.merchantLogo} />
                            <AvatarFallback className="bg-purple-600">
                                {relationship.merchantName?.charAt(0) || "M"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium text-white">{relationship.merchantName}</h3>
                            <p className="text-sm text-slate-400">Merchant</p>
                        </div>
                    </div>
                    <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                    </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-slate-400">Feature Type:</span>
                        <p className="text-white">
                            {relationship.featuringType === "FULL_PROFILE" ? "Full Profile" : "Selected Services"}
                        </p>
                    </div>
                    <div>
                        <span className="text-slate-400">Revenue Split:</span>
                        <p className="text-white">You: {yourSharePercent}% / Merchant: {merchantSharePercent}%</p>
                    </div>
                </div>

                {relationship.requestStatus === "ACCEPTED" && (
                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                            onClick={() => onTerminate(relationship.id)}
                        >
                            End Partnership
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const PendingRequestCard = ({
    relationship,
    onRespond
}: {
    relationship: FeaturingRelationship;
    onRespond: (relationship: FeaturingRelationship, accept: boolean) => void;
}) => {
    const merchantSharePercent = (relationship.merchantRevenueShareBps / 100).toFixed(1);
    const yourSharePercent = (relationship.practitionerRevenueShareBps / 100).toFixed(1);

    return (
        <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={relationship.merchantLogo} />
                            <AvatarFallback className="bg-purple-600">
                                {relationship.merchantName?.charAt(0) || "M"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium text-white">{relationship.merchantName}</h3>
                            <p className="text-sm text-slate-400">wants to feature you</p>
                        </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-400">Feature Type:</span>
                            <p className="text-white">
                                {relationship.featuringType === "FULL_PROFILE" ? "Full Profile" : "Selected Services"}
                            </p>
                        </div>
                        <div>
                            <span className="text-slate-400">Proposed Revenue Split:</span>
                            <p className="text-white">You: {yourSharePercent}% / Merchant: {merchantSharePercent}%</p>
                        </div>
                    </div>

                    {relationship.requestMessage && (
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-sm text-slate-400 mb-1">Message from merchant:</p>
                            <p className="text-sm text-white">{relationship.requestMessage}</p>
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                            onClick={() => onRespond(relationship, false)}
                            data-testid={`featuring-reject-btn-${relationship.id}`}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Decline
                        </Button>
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => onRespond(relationship, true)}
                            data-testid={`featuring-accept-btn-${relationship.id}`}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const ResponseDialog = ({
    relationship,
    accepting,
    open,
    onOpenChange,
    onSubmit,
    isLoading
}: {
    relationship: FeaturingRelationship | null;
    accepting: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (message: string) => void;
    isLoading: boolean;
}) => {
    const [message, setMessage] = useState("");

    const handleSubmit = () => {
        onSubmit(message);
        setMessage("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        {accepting ? "Accept" : "Decline"} Featuring Request
                    </DialogTitle>
                    <DialogDescription>
                        {accepting
                            ? `You&apos;re about to accept ${relationship?.merchantName}&apos;s request to feature you on their shopfront.`
                            : `You&apos;re about to decline ${relationship?.merchantName}&apos;s featuring request.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {accepting && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-green-400 font-medium">Revenue Share Agreement</p>
                                    <p className="text-slate-300 mt-1">
                                        You&apos;ll receive {((relationship?.practitionerRevenueShareBps || 0) / 100).toFixed(1)}% of
                                        each sale made through {relationship?.merchantName}&apos;s shopfront.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Response Message (Optional)</Label>
                        <Textarea
                            placeholder={accepting
                                ? "Thank you for the opportunity! I look forward to working together..."
                                : "Thank you for your interest, but I'm not able to participate at this time..."
                            }
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        className={accepting ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                        onClick={handleSubmit}
                        disabled={isLoading}
                        data-testid="featuring-response-submit-btn"
                    >
                        {isLoading ? "Submitting..." : accepting ? "Accept Request" : "Decline Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const UI: React.FC<Props> = ({ practitionerId }) => {
    const [selectedRequest, setSelectedRequest] = useState<FeaturingRelationship | null>(null);
    const [isAccepting, setIsAccepting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const relationshipsQuery = usePractitionerFeaturingRelationships(practitionerId);
    const pendingQuery = usePendingFeaturingRequests(practitionerId);

    const respondMutation = useRespondToFeaturingRequest(practitionerId);
    const terminateMutation = useTerminateFeaturingRelationship(practitionerId);

    const activeRelationships = relationshipsQuery.data?.filter(r => r.requestStatus === "ACCEPTED") || [];
    const pendingRequests = pendingQuery.data || [];

    const handleRespondClick = (relationship: FeaturingRelationship, accept: boolean) => {
        setSelectedRequest(relationship);
        setIsAccepting(accept);
        setDialogOpen(true);
    };

    const handleSubmitResponse = async (responseMessage: string) => {
        if (!selectedRequest) return;

        await respondMutation.mutateAsync({
            relationshipId: selectedRequest.id,
            accept: isAccepting,
            responseMessage: responseMessage || undefined
        });

        setDialogOpen(false);
        setSelectedRequest(null);
    };

    const handleTerminate = async (relationshipId: string) => {
        if (confirm("Are you sure you want to end this partnership? You will no longer be featured on this merchant's shopfront.")) {
            await terminateMutation.mutateAsync({ relationshipId });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Featured By</h1>
                <p className="text-slate-400 mt-1">
                    Manage merchants who feature you on their shopfronts. Accept requests to expand your reach and earn through partner sales.
                </p>
            </div>

            {pendingRequests.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <p className="text-yellow-400 font-medium">
                            You have {pendingRequests.length} pending featuring request{pendingRequests.length > 1 ? "s" : ""} to review
                        </p>
                    </div>
                </div>
            )}

            <Tabs defaultValue={pendingRequests.length > 0 ? "pending" : "active"} className="w-full">
                <TabsList className="bg-slate-800">
                    <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Active ({activeRelationships.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="data-[state=active]:bg-purple-600">
                        <Clock className="w-4 h-4 mr-2" />
                        Pending ({pendingRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                    {activeRelationships.length === 0 ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-8 text-center">
                                <Store className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">Not Featured Yet</h3>
                                <p className="text-slate-400">
                                    When merchants feature you on their shopfronts, they&apos;ll appear here.
                                    You&apos;ll earn a percentage of sales made through their storefronts.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeRelationships.map((relationship) => (
                                <ActiveRelationshipCard
                                    key={relationship.id}
                                    relationship={relationship}
                                    onTerminate={handleTerminate}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                    {pendingRequests.length === 0 ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-8 text-center">
                                <Clock className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No Pending Requests</h3>
                                <p className="text-slate-400">
                                    When merchants send you featuring requests, they&apos;ll appear here for your review.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingRequests.map((relationship) => (
                                <PendingRequestCard
                                    key={relationship.id}
                                    relationship={relationship}
                                    onRespond={handleRespondClick}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <ResponseDialog
                relationship={selectedRequest}
                accepting={isAccepting}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmitResponse}
                isLoading={respondMutation.isPending}
            />
        </div>
    );
};

export default UI;
