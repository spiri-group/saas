'use client'

import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Search, Star, UserPlus, XCircle, Clock, CheckCircle, ExternalLink, Settings, MapPin, Monitor, Calendar, LayoutGrid, Table as TableIcon } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFeaturingRelationships, FeaturingRelationship } from "./hooks/UseFeaturingRelationships"
import { useDiscoverPractitioners, DiscoveredPractitioner } from "./hooks/UseDiscoverPractitioners"
import { useCreateFeaturingRequest, useTerminateFeaturingRelationship } from "./hooks/UseFeaturingMutations"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import FeaturingConfigDialog from "./_components/FeaturingConfigDialog"

type Props = {
    merchantId: string;
}

const statusConfig = {
    PENDING: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
    ACCEPTED: { label: "Active", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
    REJECTED: { label: "Rejected", color: "bg-red-500/20 text-red-400", icon: XCircle },
    EXPIRED: { label: "Expired", color: "bg-gray-500/20 text-gray-400", icon: Clock },
    TERMINATED: { label: "Terminated", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const getScheduleSummary = (relationship: FeaturingRelationship): string | null => {
    const schedule = relationship.storeSchedule;
    if (!schedule || schedule.scheduleMode === "PRACTITIONER_DEFAULT") {
        return null;
    }
    const enabledDays = schedule.weekdays?.filter(d => d.enabled) || [];
    if (enabledDays.length === 0) return "No days set";
    const dayNames = enabledDays.map(d => d.dayName.slice(0, 3));
    const firstSlot = enabledDays[0]?.timeSlots?.[0];
    const timeStr = firstSlot ? `, ${firstSlot.start}-${firstSlot.end}` : "";
    return dayNames.join(", ") + timeStr;
};

const RelationshipCard = ({
    relationship,
    onTerminate,
    onConfigure
}: {
    relationship: FeaturingRelationship;
    onTerminate: (id: string) => void;
    onConfigure: (relationship: FeaturingRelationship) => void;
}) => {
    const status = statusConfig[relationship.requestStatus];
    const StatusIcon = status.icon;
    const revenueSharePercent = (relationship.merchantRevenueShareBps / 100).toFixed(1);
    const scheduleSummary = getScheduleSummary(relationship);
    const delivery = relationship.deliveryContext;
    const hasPriceOverrides = (relationship.servicePriceOverrides?.length || 0) > 0;

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={relationship.practitionerAvatar} />
                            <AvatarFallback className="bg-amber-600">
                                {relationship.practitionerName?.charAt(0) || "P"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium text-white">{relationship.practitionerName}</h3>
                            <p className="text-sm text-slate-400">{relationship.practitionerHeadline || "Practitioner"}</p>
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
                        <span className="text-slate-400">Your Revenue Share:</span>
                        <p className="text-white">{revenueSharePercent}%</p>
                    </div>
                </div>

                {/* Schedule, delivery, pricing indicators */}
                {relationship.requestStatus === "ACCEPTED" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {scheduleSummary && (
                            <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                                <Calendar className="w-3 h-3 mr-1" />
                                {scheduleSummary}
                            </Badge>
                        )}
                        {!scheduleSummary && (
                            <Badge variant="secondary" className="text-xs bg-slate-700/50 text-slate-500">
                                <Calendar className="w-3 h-3 mr-1" />
                                Practitioner&apos;s schedule
                            </Badge>
                        )}
                        {delivery?.inStore && (
                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                                <MapPin className="w-3 h-3 mr-1" />
                                In-Store
                            </Badge>
                        )}
                        {delivery?.online && (
                            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                                <Monitor className="w-3 h-3 mr-1" />
                                Online
                            </Badge>
                        )}
                        {hasPriceOverrides && (
                            <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400">
                                Custom pricing
                            </Badge>
                        )}
                    </div>
                )}

                {relationship.requestStatus === "ACCEPTED" && (
                    <div className="mt-4 flex justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-amber-400 border-amber-400/50 hover:bg-amber-400/10"
                            onClick={() => onConfigure(relationship)}
                            data-testid={`configure-featuring-btn-${relationship.id}`}
                        >
                            <Settings className="w-4 h-4 mr-1" />
                            Configure
                        </Button>
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

const PractitionerCard = ({
    practitioner,
    onFeature
}: {
    practitioner: DiscoveredPractitioner;
    onFeature: (practitioner: DiscoveredPractitioner) => void;
}) => {
    const rating = practitioner.rating;

    return (
        <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={practitioner.logo?.url} />
                            <AvatarFallback className="bg-amber-600">
                                {practitioner.name?.charAt(0) || "P"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium text-white">{practitioner.name}</h3>
                            <p className="text-sm text-slate-400 line-clamp-1">
                                {practitioner.practitioner?.headline || "Spiritual Practitioner"}
                            </p>
                        </div>
                    </div>
                    {rating && rating.total_count > 0 && (
                        <div className="flex items-center text-yellow-400">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="ml-1 text-sm">{rating.average.toFixed(1)}</span>
                            <span className="ml-1 text-xs text-slate-500">({rating.total_count})</span>
                        </div>
                    )}
                </div>

                {practitioner.practitioner?.modalities && practitioner.practitioner.modalities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {practitioner.practitioner.modalities.slice(0, 3).map((modality) => (
                            <Badge key={modality} variant="secondary" className="text-xs bg-slate-700 text-white">
                                {modality.replace(/_/g, " ")}
                            </Badge>
                        ))}
                        {practitioner.practitioner.modalities.length > 3 && (
                            <Badge variant="secondary" className="text-xs bg-slate-700 text-white">
                                +{practitioner.practitioner.modalities.length - 3}
                            </Badge>
                        )}
                    </div>
                )}

                <div className="mt-4 flex gap-2">
                    <a
                        href={`/p/${practitioner.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            data-testid={`view-practitioner-btn-${practitioner.id}`}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Profile
                        </Button>
                    </a>
                    <Button
                        size="sm"
                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                        onClick={() => onFeature(practitioner)}
                        data-testid={`feature-practitioner-btn-${practitioner.id}`}
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Feature
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const PractitionerCompareTable = ({
    practitioners,
    onFeature
}: {
    practitioners: DiscoveredPractitioner[];
    onFeature: (practitioner: DiscoveredPractitioner) => void;
}) => {
    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    return (
        <div className="rounded-lg border border-slate-700 overflow-hidden" data-testid="practitioner-compare-table">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-800/80 border-slate-700">
                        <TableHead className="text-slate-300">Practitioner</TableHead>
                        <TableHead className="text-slate-300">Rating</TableHead>
                        <TableHead className="text-slate-300">Modalities</TableHead>
                        <TableHead className="text-slate-300 text-center">Services</TableHead>
                        <TableHead className="text-slate-300">Price Range</TableHead>
                        <TableHead className="text-slate-300 text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {practitioners.map((practitioner) => (
                        <TableRow key={practitioner.id} className="border-slate-700 hover:bg-slate-800/30">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={practitioner.logo?.url} />
                                        <AvatarFallback className="bg-amber-600 text-sm">
                                            {practitioner.name?.charAt(0) || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium text-white">{practitioner.name}</p>
                                        <p className="text-xs text-slate-400 line-clamp-1">
                                            {practitioner.practitioner?.headline || "Practitioner"}
                                        </p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {practitioner.rating && practitioner.rating.total_count > 0 ? (
                                    <div className="flex items-center text-yellow-400">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        <span className="ml-1 text-sm text-white">{practitioner.rating.average.toFixed(1)}</span>
                                        <span className="ml-1 text-xs text-slate-500">({practitioner.rating.total_count})</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-500">No reviews</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {practitioner.practitioner?.modalities?.slice(0, 2).map((m) => (
                                        <Badge key={m} variant="secondary" className="text-[10px] bg-slate-700 text-white">
                                            {m.replace(/_/g, " ")}
                                        </Badge>
                                    ))}
                                    {(practitioner.practitioner?.modalities?.length || 0) > 2 && (
                                        <Badge variant="secondary" className="text-[10px] bg-slate-700 text-white">
                                            +{(practitioner.practitioner?.modalities?.length || 0) - 2}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="text-sm text-white">{practitioner.serviceCount || 0}</span>
                            </TableCell>
                            <TableCell>
                                {practitioner.priceRange?.min && practitioner.priceRange?.max ? (
                                    <span className="text-sm text-white">
                                        {formatPrice(practitioner.priceRange.min.amount, practitioner.priceRange.min.currency)}
                                        {practitioner.priceRange.min.amount !== practitioner.priceRange.max.amount && (
                                            <> - {formatPrice(practitioner.priceRange.max.amount, practitioner.priceRange.max.currency)}</>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-500">N/A</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() => onFeature(practitioner)}
                                    data-testid={`feature-table-btn-${practitioner.id}`}
                                >
                                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                                    Feature
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

const FeatureRequestDialog = ({
    practitioner,
    open,
    onOpenChange,
    onSubmit,
    isLoading
}: {
    practitioner: DiscoveredPractitioner | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { merchantRevenueShareBps: number; requestMessage: string }) => void;
    isLoading: boolean;
}) => {
    const [revenueShare, setRevenueShare] = useState(15);
    const [message, setMessage] = useState("");

    const handleSubmit = () => {
        onSubmit({
            merchantRevenueShareBps: revenueShare * 100,
            requestMessage: message
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white">Feature {practitioner?.name}</DialogTitle>
                    <DialogDescription>
                        Send a featuring request to this practitioner. They&apos;ll need to accept before their services appear on your shopfront.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Your Revenue Share: {revenueShare}%</Label>
                        <p className="text-sm text-slate-400">
                            You&apos;ll receive this percentage of each sale made through your featured section.
                        </p>
                        <Slider
                            value={[revenueShare]}
                            onValueChange={([value]) => setRevenueShare(value)}
                            min={5}
                            max={30}
                            step={1}
                            className="py-4"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>5%</span>
                            <span>30%</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Message (Optional)</Label>
                        <Textarea
                            placeholder="Introduce yourself and explain why you'd like to feature this practitioner..."
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
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        data-testid="featuring-request-btn"
                    >
                        {isLoading ? "Sending..." : "Send Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const UI: React.FC<Props> = ({ merchantId }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPractitioner, setSelectedPractitioner] = useState<DiscoveredPractitioner | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("active");
    const [configRelationship, setConfigRelationship] = useState<FeaturingRelationship | null>(null);
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [discoverViewMode, setDiscoverViewMode] = useState<"grid" | "table">("grid");

    const relationshipsQuery = useFeaturingRelationships(merchantId);
    const discoverQuery = useDiscoverPractitioners(merchantId, {
        search: searchQuery || undefined,
        limit: 12
    });

    const createRequestMutation = useCreateFeaturingRequest(merchantId);
    const terminateMutation = useTerminateFeaturingRelationship(merchantId);

    const activeRelationships = relationshipsQuery.data?.filter(r => r.requestStatus === "ACCEPTED") || [];
    const pendingRelationships = relationshipsQuery.data?.filter(r => r.requestStatus === "PENDING") || [];

    const handleConfigure = (relationship: FeaturingRelationship) => {
        setConfigRelationship(relationship);
        setConfigDialogOpen(true);
    };

    const handleFeatureClick = (practitioner: DiscoveredPractitioner) => {
        setSelectedPractitioner(practitioner);
        setDialogOpen(true);
    };

    const handleSubmitRequest = async (data: { merchantRevenueShareBps: number; requestMessage: string }) => {
        if (!selectedPractitioner) return;

        try {
            const result = await createRequestMutation.mutateAsync({
                practitionerId: selectedPractitioner.id,
                featuringType: "FULL_PROFILE",
                merchantRevenueShareBps: data.merchantRevenueShareBps,
                requestMessage: data.requestMessage
            });

            if (result.success) {
                toast.success("Featuring request sent successfully!");
                setDialogOpen(false);
                setSelectedPractitioner(null);
                setActiveTab("pending");
            } else {
                toast.error(result.message || "Failed to send featuring request");
            }
        } catch (error) {
            console.error("Error sending featuring request:", error);
            toast.error("Failed to send featuring request. Please try again.");
        }
    };

    const handleTerminate = async (relationshipId: string) => {
        if (confirm("Are you sure you want to end this partnership?")) {
            await terminateMutation.mutateAsync({ relationshipId });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Featured Practitioners</h1>
                <p className="text-slate-400 mt-1">
                    Partner with practitioners to feature their services on your shopfront and earn commission on sales.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-800">
                    <TabsTrigger value="active" className="text-white data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Active ({activeRelationships.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-white data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <Clock className="w-4 h-4 mr-2" />
                        Pending ({pendingRelationships.length})
                    </TabsTrigger>
                    <TabsTrigger value="discover" className="text-white data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <Search className="w-4 h-4 mr-2" />
                        Discover
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6">
                    {activeRelationships.length === 0 ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-8 text-center">
                                <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No Active Partnerships</h3>
                                <p className="text-slate-400 mb-4">
                                    Start featuring practitioners to earn commission on their services.
                                </p>
                                <Button
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() => setActiveTab("discover")}
                                >
                                    <Search className="w-4 h-4 mr-2" />
                                    Discover Practitioners
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeRelationships.map((relationship) => (
                                <RelationshipCard
                                    key={relationship.id}
                                    relationship={relationship}
                                    onTerminate={handleTerminate}
                                    onConfigure={handleConfigure}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                    {pendingRelationships.length === 0 ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-8 text-center">
                                <Clock className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No Pending Requests</h3>
                                <p className="text-slate-400">
                                    Your featuring requests will appear here while awaiting practitioner approval.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingRelationships.map((relationship) => (
                                <RelationshipCard
                                    key={relationship.id}
                                    relationship={relationship}
                                    onTerminate={handleTerminate}
                                    onConfigure={handleConfigure}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="discover" className="mt-6 space-y-6">
                    <div className="flex items-center space-x-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Search practitioners..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                                dark
                            />
                        </div>
                        <div className="flex border border-slate-700 rounded-md overflow-hidden">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-none px-3 ${discoverViewMode === "grid" ? "bg-amber-600 text-white" : "text-slate-400"}`}
                                onClick={() => setDiscoverViewMode("grid")}
                                data-testid="discover-grid-view-btn"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-none px-3 ${discoverViewMode === "table" ? "bg-amber-600 text-white" : "text-slate-400"}`}
                                onClick={() => setDiscoverViewMode("table")}
                                data-testid="discover-table-view-btn"
                            >
                                <TableIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {discoverQuery.isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                            <p className="mt-4 text-slate-400">Loading practitioners...</p>
                        </div>
                    ) : discoverQuery.data?.practitioners.length === 0 ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="p-8 text-center">
                                <Search className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-2">No Practitioners Found</h3>
                                <p className="text-slate-400">
                                    Try adjusting your search or check back later.
                                </p>
                            </CardContent>
                        </Card>
                    ) : discoverViewMode === "table" ? (
                        <PractitionerCompareTable
                            practitioners={discoverQuery.data?.practitioners || []}
                            onFeature={handleFeatureClick}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {discoverQuery.data?.practitioners.map((practitioner) => (
                                <PractitionerCard
                                    key={practitioner.id}
                                    practitioner={practitioner}
                                    onFeature={handleFeatureClick}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <FeatureRequestDialog
                practitioner={selectedPractitioner}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmitRequest}
                isLoading={createRequestMutation.isPending}
            />

            <FeaturingConfigDialog
                relationship={configRelationship}
                open={configDialogOpen}
                onOpenChange={setConfigDialogOpen}
                merchantId={merchantId}
            />
        </div>
    );
};

export default UI;
