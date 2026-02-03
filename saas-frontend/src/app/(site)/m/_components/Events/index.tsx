'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { PlusIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import EventForm from "./EventForm";
import { useVendorEvents } from "./hooks/UseVendorEvents";
import { useDeleteVendorEvent } from "./hooks/UseDeleteVendorEvent";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from 'uuid';

type Props = {
    merchantId: string;
}

const MerchantEventsComponent: React.FC<Props> = ({ merchantId }) => {
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newEventId, setNewEventId] = useState<string | null>(null);
    
    const { data: events, isLoading } = useVendorEvents(merchantId);
    const deleteEventMutation = useDeleteVendorEvent();
    
    const hasExistingEvents = events && events.length > 0;

    const handleCreateNew = () => {
        setSelectedEvent(null);
        setIsCreating(true);
        setNewEventId(uuidv4());
    };

    const handleSelectEvent = (event: any) => {
        setSelectedEvent(event);
        setIsCreating(false);
    };

    const handleDelete = async (eventId: string) => {
        if (confirm("Are you sure you want to delete this event?")) {
            try {
                await deleteEventMutation.mutateAsync(eventId);
                if (selectedEvent?.id === eventId) {
                    setSelectedEvent(null);
                    setIsCreating(false);
                }
            } catch (error) {
                console.error("Failed to delete event:", error);
            }
        }
    };

    const formatEventDate = (startAt: string, endAt: string) => {
        const start = DateTime.fromISO(startAt);
        const end = DateTime.fromISO(endAt);
        
        if (start.hasSame(end, 'day')) {
            return `${start.toFormat('MMM dd')} • ${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a')}`;
        } else {
            return `${start.toFormat('MMM dd h:mm a')} - ${end.toFormat('MMM dd h:mm a')}`;
        }
    };

    const handleFormSuccess = () => {
        setIsCreating(false);
        setSelectedEvent(null);
        setNewEventId(null);
    };

    return (
        <div className="flex flex-col h-[750px]">
            {/* Header with Close Button - Only show when not in create/edit mode */}
            {!isCreating && !selectedEvent && (
                <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <div className="mr-8">
                        <h2 className="text-2xl font-bold">Manage Your Events</h2>
                        <p className="text-muted-foreground">Create and manage events for your customers</p>
                    </div>
                    <Button variant="outline" onClick={() => {
                        // Dispatch a custom event to close the dialog
                        const event = new CustomEvent('close-dialog');
                        window.dispatchEvent(event);
                    }}>
                        ✕ Close
                    </Button>
                </div>
            )}
            
            <div className={`flex flex-1 ${!hasExistingEvents && !isCreating ? 'justify-center items-center' : ''}`}>
            {/* Left Sidebar with Carousel - Only show if there are existing events */}
            {hasExistingEvents && (
                <div className="w-80 border-r bg-muted/30 flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="font-medium mb-2">Select an event to edit</h3>
                    <p className="text-xs text-muted-foreground">
                        Choose an event from below or create a new one
                    </p>
                </div>
                
                <div className="flex-1 p-4">
                    {isLoading ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            Loading events...
                        </div>
                    ) : (
                        <Carousel
                            orientation="vertical"
                            opts={{
                                align: "start",
                            }}
                            className="h-full"
                        >
                            <CarouselContent className="h-full -mt-4">
                                {/* Create New Event Item */}
                                <CarouselItem className="pt-4 basis-1/3">
                                    <Card 
                                        className={`cursor-pointer transition-colors hover:bg-accent/50 h-full ${
                                            isCreating ? 'ring-2 ring-primary' : ''
                                        }`}
                                        onClick={handleCreateNew}
                                    >
                                        <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                                            <div className="w-full h-16 bg-muted rounded mb-3 flex items-center justify-center">
                                                <PlusIcon className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <h4 className="font-medium text-sm mb-1">Create New Event</h4>
                                            <p className="text-xs text-muted-foreground">Add upcoming event</p>
                                        </CardContent>
                                    </Card>
                                </CarouselItem>

                                {/* Existing Events */}
                                {events?.map((event) => (
                                    <CarouselItem key={event.id} className="pt-4 basis-1/3">
                                        <Card 
                                            className={`cursor-pointer transition-colors hover:bg-accent/50 h-full ${
                                                selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''
                                            }`}
                                            onClick={() => handleSelectEvent(event)}
                                        >
                                            <CardContent className="p-3 h-full flex flex-col">
                                                {/* Event Image Thumbnail */}
                                                {event.landscapeImage ? (
                                                    <div className="w-full h-16 bg-muted rounded mb-3 overflow-hidden">
                                                        <img
                                                            src={event.landscapeImage.image.media.url}
                                                            alt={event.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-16 bg-muted rounded mb-3 flex items-center justify-center">
                                                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                
                                                <div className="flex-1 space-y-1">
                                                    <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
                                                    <div className="flex items-center text-xs text-muted-foreground">
                                                        <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                                        <span className="line-clamp-1">{formatEventDate(event.startAt, event.endAt)}</span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-muted-foreground">
                                                        <MapPinIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                                        <span className="line-clamp-1">{event.location.address?.formattedAddress}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                                   <span className="text-xs text-muted-foreground">
                                                        {event.visibility === 'public' ? 'Public' : 'Private'}
                                                   </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {events && events.length > 2 && (
                                <>
                                    <CarouselPrevious />
                                    <CarouselNext />
                                </>
                            )}
                        </Carousel>
                    )}
                </div>
                </div>
            )}

            {/* Form Area - Full width when no existing events */}
            <div className={`${hasExistingEvents ? 'flex-1' : 'w-full max-w-4xl'} flex flex-col`}>
                {(isCreating || selectedEvent) && (
                    <div className="p-6 border-b flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-medium">
                                {isCreating ? 'Create New Event' : 'Edit Event'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {isCreating 
                                    ? 'Events will appear in the first 3 tiles of your catalogue'
                                    : 'Update your event details below'
                                }
                            </p>
                        </div>
                        <Button variant="outline" onClick={() => {
                            // Dispatch a custom event to close the dialog
                            const event = new CustomEvent('close-dialog');
                            window.dispatchEvent(event);
                        }}>
                            ✕ Close
                        </Button>
                    </div>
                )}
                
                <div className="flex-1 p-6">
                    {(isCreating || selectedEvent) ? (
                        <EventForm 
                            merchantId={merchantId}
                            event={selectedEvent}
                            eventId={newEventId}
                            onSuccess={handleFormSuccess}
                            onDelete={selectedEvent ? () => handleDelete(selectedEvent.id) : undefined}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h4 className="text-lg font-medium mb-2">Manage Your Events</h4>
                                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                    Create and manage events that will be showcased in your catalogue. 
                                    Let customers know where they can meet you in person.
                                </p>
                                <Button onClick={handleCreateNew}>
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Create Your First Event
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};

export default MerchantEventsComponent;