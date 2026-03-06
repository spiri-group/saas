'use client'

import React, { useState } from "react"
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { useUnifiedCart } from "@/app/(site)/components/Catalogue/components/ShoppingCart/useUnifiedCart";
import { useBirthChart } from "@/app/(site)/u/[userId]/space/astrology/_hooks/useBirthChart";
import { Clock, FileText, Package, Stars, AlertCircle, ArrowLeft, Calendar } from "lucide-react";
import ScheduledBookingFlow from "./components/ScheduledBookingFlow";
import { usePractitionerDeliveryMethods } from "./hooks/UsePractitionerDeliveryMethods";
import QuestionnaireRenderer from "@/components/ux/QuestionnaireRenderer";

// Types
type ServiceDeliveryFormat = {
    format: string;
    description?: string;
};

type ServiceQuestion = {
    id: string;
    question: string;
    type: "TEXT" | "TEXTAREA" | "SELECT" | "MULTISELECT" | "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN" | "DATE" | "NUMBER" | "EMAIL" | "RATING" | "LINEAR_SCALE" | "YES_NO" | "PHONE" | "TIME" | "PHOTO";
    required: boolean;
    options?: string[];
    description?: string;
    scaleMax?: number;
};

type ServicePricing = {
    type: "FIXED" | "PACKAGE" | "HOURLY";
    fixedPrice?: {
        amount: number;
        currency: string;
    };
    packages?: Array<{
        name: string;
        description?: string;
        price: {
            amount: number;
            currency: string;
        };
        sessions?: number;
    }>;
    hourlyRate?: {
        amount: number;
        currency: string;
    };
};

type ServiceAddOn = {
    id: string;
    name: string;
    description?: string;
    price: {
        amount: number;
        currency: string;
    };
};

type ReadingOptions = {
    readingType?: string;
};

type Service = {
    id: string;
    slug: string;
    vendorId: string;
    vendor: {
        id: string;
        name: string;
        slug: string;
    };
    name: string;
    description: string;
    terms?: string;
    faq?: Array<{
        id: string;
        title: string;
        description: string;
    }>;
    thumbnail?: {
        image?: {
            media?: {
                url: string;
            };
        };
        title?: {
            content: string;
        };
    };
    category: "READING" | "HEALING" | "COACHING";
    deliveryMode: "SYNC" | "ASYNC";
    bookingType?: "SCHEDULED" | "ASAP" | "PACKAGE";
    pricing: ServicePricing;
    turnaroundDays?: number;
    duration?: {
        amount: number;
        unit: {
            id: string;
            defaultLabel: string;
        };
    };
    deliveryFormats?: ServiceDeliveryFormat[];
    addOns?: ServiceAddOn[];
    questionnaire?: ServiceQuestion[];
    readingOptions?: ReadingOptions;
};

type QuestionnaireResponses = Record<string, string | string[]>;

// Hook to fetch service details
const useServiceDetails = (practitionerId: string, serviceSlug: string) => {
    return useQuery({
        queryKey: ['practitioner-service-details', practitionerId, serviceSlug],
        queryFn: async () => {
            const response = await gql<{ service: Service }>(`
                query GetServiceDetails($vendorId: ID!, $slug: String!) {
                    service(vendorId: $vendorId, slug: $slug) {
                        id
                        slug
                        vendorId
                        vendor {
                            id
                            name
                            slug
                        }
                        name
                        description
                        terms
                        faq {
                            id
                            title
                            description
                        }
                        thumbnail {
                            image {
                                media {
                                    url
                                }
                            }
                            title {
                                content
                            }
                        }
                        category
                        deliveryMode
                        bookingType
                        duration {
                            amount
                            unit {
                                id
                                defaultLabel
                            }
                        }
                        pricing {
                            type
                            fixedPrice {
                                amount
                                currency
                            }
                            packages {
                                name
                                description
                                price {
                                    amount
                                    currency
                                }
                                sessions
                            }
                            hourlyRate {
                                amount
                                currency
                            }
                        }
                        turnaroundDays
                        deliveryFormats {
                            format
                            description
                        }
                        addOns {
                            id
                            name
                            description
                            price {
                                amount
                                currency
                            }
                        }
                        questionnaire {
                            id
                            question
                            type
                            required
                            options
                        }
                        readingOptions {
                            readingType
                        }
                    }
                }
            `, {
                vendorId: practitionerId,
                slug: serviceSlug
            });
            return response.service;
        },
        enabled: !!practitionerId && !!serviceSlug
    });
};

type Props = {
    practitionerId: string;
    practitionerSlug: string;
    serviceSlug: string;
};

const UI: React.FC<Props> = ({ practitionerId, practitionerSlug, serviceSlug }) => {
    const session = useSession();
    const { data: service, isLoading, error } = useServiceDetails(practitionerId, serviceSlug);
    const { addService, isAddingService } = useUnifiedCart();
    const { data: deliveryMethods } = usePractitionerDeliveryMethods(practitionerId);

    const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
    const [questionnaireResponses, setQuestionnaireResponses] = useState<QuestionnaireResponses>({});
    const [bookingComplete, setBookingComplete] = useState(false);

    // Check if this is an astrology reading that requires birth chart
    const isAstrologyReading = service?.readingOptions?.readingType === 'Astrology';
    const userId = session.data?.user?.id as string | undefined;

    // Only fetch birth chart if this is an astrology service and user is logged in
    const birthChartQuery = useBirthChart(userId || '');
    const hasBirthChart = !!birthChartQuery.data;
    const birthChartLoading = birthChartQuery.isLoading && isAstrologyReading && !!userId;
    const needsBirthChart = isAstrologyReading && userId && !hasBirthChart && !birthChartLoading;

    const handleAddToCart = () => {
        if (!service) return;

        const questionnaireResponsesArray = Object.entries(questionnaireResponses).map(([questionId, answer]) => {
            const question = service.questionnaire?.find(q => q.id === questionId);
            return {
                questionId,
                question: question?.question || '',
                answer: Array.isArray(answer) ? answer.join(', ') : answer
            };
        });

        addService({
            serviceId: service.id,
            questionnaireResponses: questionnaireResponsesArray.length > 0 ? questionnaireResponsesArray : undefined,
            selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined
        });
    };

    const toggleAddOn = (id: string) => {
        setSelectedAddOns(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const setQuestionResponse = (questionId: string, value: string | string[]) => {
        setQuestionnaireResponses(prev => ({ ...prev, [questionId]: value }));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading service details...</div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-white mb-2">Service not found</h1>
                    <p className="text-slate-300 mb-4">This service may have been removed or is not available.</p>
                    <Link href={`/p/${practitionerSlug}`}>
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Profile
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case "READING": return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
            case "HEALING": return "bg-green-500/20 text-green-300 border-green-500/30";
            case "COACHING": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
            default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
        }
    };

    const calculateTotalPrice = () => {
        let total = 0;

        if (service.pricing.type === "FIXED" && service.pricing.fixedPrice) {
            total = service.pricing.fixedPrice.amount;
        } else if (service.pricing.type === "PACKAGE" && selectedPackage !== null && service.pricing.packages) {
            total = service.pricing.packages[selectedPackage].price.amount;
        } else if (service.pricing.type === "HOURLY" && service.pricing.hourlyRate) {
            total = service.pricing.hourlyRate.amount;
        }

        selectedAddOns.forEach(addOnId => {
            const addOn = service.addOns?.find(a => a.id === addOnId);
            if (addOn) total += addOn.price.amount;
        });

        return {
            amount: total,
            currency: service.pricing.fixedPrice?.currency ||
                      service.pricing.packages?.[0]?.price.currency ||
                      service.pricing.hourlyRate?.currency ||
                      "USD"
        };
    };

    const totalPrice = calculateTotalPrice();

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900">
            <div className="mx-auto px-4 md:px-8 lg:px-12 py-8">
                {/* Back Link */}
                <Link
                    href={`/p/${practitionerSlug}`}
                    className="inline-flex items-center text-indigo-300 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to {service.vendor.name}&apos;s Profile
                </Link>

                <Panel className="backdrop-blur-xl bg-white/[0.07] shadow-2xl border border-white/15">
                    <PanelHeader className="mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <PanelTitle as="h1" className="text-xl text-white" data-testid="service-name">
                                        {service.name}
                                    </PanelTitle>
                                    <Badge className={getCategoryBadgeColor(service.category)}>
                                        {service.category}
                                    </Badge>
                                </div>
                                <PanelDescription className="flex flex-row gap-1 items-center">
                                    <span className="text-slate-400">Offered by</span>
                                    <span className="font-bold text-white">{service.vendor.name}</span>
                                    <Link href={`/p/${practitionerSlug}`} className="text-sm text-indigo-400 hover:underline">
                                        View Profile
                                    </Link>
                                </PanelDescription>
                            </div>
                        </div>
                    </PanelHeader>

                    <PanelContent className="flex flex-col lg:flex-row gap-6">
                        {/* Left Column - Service Details */}
                        <div className="flex-1 space-y-6">
                            {service.thumbnail?.image?.media?.url && (
                                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                                    <Image
                                        src={service.thumbnail.image.media.url}
                                        alt={service.thumbnail.title?.content || service.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <div>
                                <h2 className="text-lg font-semibold text-white mb-3">About This Service</h2>
                                <div className="text-slate-300 whitespace-pre-line" data-testid="service-description" dangerouslySetInnerHTML={{ __html: service.description }} />
                            </div>

                            {service.deliveryMode === "ASYNC" && service.turnaroundDays && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <Clock className="w-5 h-5 text-indigo-400" />
                                    <span className="text-slate-300">
                                        Typical delivery: {service.turnaroundDays} {service.turnaroundDays === 1 ? 'day' : 'days'}
                                    </span>
                                </div>
                            )}

                            {service.deliveryFormats && service.deliveryFormats.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-white mb-2">Delivery Formats</h3>
                                    <ul className="space-y-2">
                                        {service.deliveryFormats.map((format, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <FileText className="w-4 h-4 mt-0.5 text-indigo-400" />
                                                <div>
                                                    <div className="text-slate-200 font-medium">{format.format}</div>
                                                    {format.description && (
                                                        <div className="text-sm text-slate-400">{format.description}</div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {service.faq && service.faq.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-white mb-3">Frequently Asked Questions</h3>
                                    <Accordion type="single" collapsible>
                                        {service.faq.map((item) => (
                                            <AccordionItem key={item.id} value={item.id} className="border-white/10">
                                                <AccordionTrigger className="text-slate-200">{item.title}</AccordionTrigger>
                                                <AccordionContent className="text-slate-400">
                                                    {item.description}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            )}

                            {service.terms && (
                                <div>
                                    <h3 className="text-md font-semibold text-white mb-2">Terms & Conditions</h3>
                                    <p className="text-sm text-slate-400 whitespace-pre-line">
                                        {service.terms}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Pricing & Add to Cart */}
                        <div className="lg:w-96 space-y-4">
                            {/* Scheduled Booking Flow for SYNC services with SCHEDULED booking type */}
                            {service.deliveryMode === "SYNC" && service.bookingType === "SCHEDULED" ? (
                                bookingComplete ? (
                                    <Card className="bg-white/[0.07] border-white/15">
                                        <CardContent className="py-8 text-center space-y-4">
                                            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Calendar className="w-8 h-8 text-green-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white">Booking Request Sent!</h3>
                                            <p className="text-slate-300">
                                                Your booking request has been submitted. The practitioner will review and confirm your appointment soon.
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                You&apos;ll receive an email once your booking is confirmed.
                                            </p>
                                            <Link href={`/p/${practitionerSlug}`}>
                                                <Button variant="outline" className="mt-4">
                                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                                    Back to Profile
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <ScheduledBookingFlow
                                        vendorId={practitionerId}
                                        serviceId={service.id}
                                        customerId={userId}
                                        deliveryMethods={deliveryMethods}
                                        serviceName={service.name}
                                        serviceDuration={service.duration}
                                        pricing={service.pricing}
                                        questionnaire={service.questionnaire}
                                        addOns={service.addOns}
                                        onComplete={() => setBookingComplete(true)}
                                    />
                                )
                            ) : (
                            <Card className="bg-white/[0.07] border-white/15">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <Package className="w-5 h-5" />
                                        Select Your Option
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Fixed Price */}
                                    {service.pricing.type === "FIXED" && service.pricing.fixedPrice && (
                                        <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10" data-testid="service-price">
                                            <div className="text-2xl font-bold text-indigo-300">
                                                <CurrencySpan value={service.pricing.fixedPrice} withAnimation={false} />
                                            </div>
                                            <div className="text-sm text-slate-400">Fixed Price</div>
                                        </div>
                                    )}

                                    {/* Package Selection */}
                                    {service.pricing.type === "PACKAGE" && service.pricing.packages && (
                                        <div className="space-y-2" data-testid="service-price">
                                            <Label className="text-slate-300">Choose a Package</Label>
                                            {service.pricing.packages.map((pkg, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                        selectedPackage === idx
                                                            ? 'border-indigo-500 bg-indigo-500/10'
                                                            : 'border-white/15 hover:border-indigo-500/40'
                                                    }`}
                                                    onClick={() => setSelectedPackage(idx)}
                                                    data-testid={`package-option-${idx}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-semibold text-white">{pkg.name}</div>
                                                            {pkg.description && (
                                                                <div className="text-sm text-slate-400">{pkg.description}</div>
                                                            )}
                                                            {pkg.sessions && (
                                                                <div className="text-sm text-slate-400">
                                                                    {pkg.sessions} sessions
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="font-bold text-indigo-300">
                                                            <CurrencySpan value={pkg.price} withAnimation={false} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Hourly Rate */}
                                    {service.pricing.type === "HOURLY" && service.pricing.hourlyRate && (
                                        <div className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-500/10" data-testid="service-price">
                                            <div className="text-2xl font-bold text-indigo-300">
                                                <CurrencySpan value={service.pricing.hourlyRate} withAnimation={false} />
                                            </div>
                                            <div className="text-sm text-slate-400">Per Hour</div>
                                        </div>
                                    )}

                                    {/* Add-ons */}
                                    {service.addOns && service.addOns.length > 0 && (
                                        <>
                                            <Separator className="bg-white/10" />
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Add-Ons (Optional)</Label>
                                                {service.addOns.map((addOn) => (
                                                    <div
                                                        key={addOn.id}
                                                        className="flex items-start gap-2 p-2 rounded hover:bg-white/5"
                                                    >
                                                        <Checkbox
                                                            checked={selectedAddOns.includes(addOn.id)}
                                                            onCheckedChange={() => toggleAddOn(addOn.id)}
                                                            dark
                                                            data-testid={`addon-${addOn.id}`}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-medium text-slate-200">{addOn.name}</div>
                                                                    {addOn.description && (
                                                                        <div className="text-sm text-slate-400">{addOn.description}</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm font-semibold text-indigo-300">
                                                                    +<CurrencySpan value={addOn.price} withAnimation={false} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Questionnaire */}
                                    {service.questionnaire && service.questionnaire.length > 0 && (
                                        <>
                                            <Separator className="bg-white/10" />
                                            <div className="space-y-3">
                                                <Label className="text-slate-300">Intake Questionnaire</Label>
                                                <QuestionnaireRenderer
                                                    questions={service.questionnaire}
                                                    responses={questionnaireResponses}
                                                    onResponseChange={setQuestionResponse}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <Separator className="bg-white/10" />

                                    {/* Total & Add to Cart */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-200">Total</span>
                                            <span className="text-2xl font-bold text-indigo-300">
                                                <CurrencySpan value={totalPrice} withAnimation={false} />
                                            </span>
                                        </div>

                                        {/* Birth Chart Gate for Astrology Readings */}
                                        {needsBirthChart ? (
                                            <Alert className="border-indigo-500/30 bg-indigo-500/10">
                                                <Stars className="h-4 w-4 text-indigo-400" />
                                                <AlertTitle className="text-indigo-300">Birth Chart Required</AlertTitle>
                                                <AlertDescription className="text-indigo-200/80">
                                                    This astrology reading requires your birth chart. Please set up your birth chart first to continue.
                                                </AlertDescription>
                                                <Link href={`/u/${userId}/space/astrology/birth-chart?autoSetup=MEDIUMSHIP`}>
                                                    <Button
                                                        className="w-full mt-3 border-white/20 text-white hover:bg-white/10"
                                                        size="lg"
                                                        variant="outline"
                                                        data-testid="setup-birth-chart-btn"
                                                    >
                                                        <Stars className="w-4 h-4 mr-2" />
                                                        Set Up Birth Chart
                                                    </Button>
                                                </Link>
                                            </Alert>
                                        ) : isAstrologyReading && session.status !== 'authenticated' ? (
                                            <Alert className="border-blue-500/30 bg-blue-500/10">
                                                <AlertCircle className="h-4 w-4 text-blue-400" />
                                                <AlertTitle className="text-blue-300">Sign In Required</AlertTitle>
                                                <AlertDescription className="text-blue-200/80">
                                                    This astrology reading requires your birth chart. Please sign in to continue.
                                                </AlertDescription>
                                                <Link href="/">
                                                    <Button
                                                        className="w-full mt-3 border-white/20 text-white hover:bg-white/10"
                                                        size="lg"
                                                        variant="outline"
                                                    >
                                                        Sign In
                                                    </Button>
                                                </Link>
                                            </Alert>
                                        ) : birthChartLoading ? (
                                            <Button
                                                className="w-full"
                                                size="lg"
                                                disabled
                                            >
                                                Checking birth chart...
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                                size="lg"
                                                onClick={handleAddToCart}
                                                disabled={isAddingService}
                                                data-testid="add-to-cart-btn"
                                            >
                                                {isAddingService ? 'Adding...' : 'Add to Cart'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            )}
                        </div>
                    </PanelContent>
                </Panel>
            </div>
        </div>
    );
};

export default UI;
