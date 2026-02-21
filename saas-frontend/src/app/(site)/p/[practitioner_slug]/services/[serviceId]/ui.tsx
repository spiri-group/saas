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

// Types
type ServiceDeliveryFormat = {
    format: string;
    description?: string;
};

type ServiceQuestion = {
    id: string;
    question: string;
    type: "TEXT" | "TEXTAREA" | "SELECT" | "MULTISELECT";
    required: boolean;
    options?: string[];
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
            <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white">Loading service details...</div>
            </div>
        );
    }

    if (error || !service) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-900 to-slate-900 flex items-center justify-center">
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
            case "READING": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
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
        <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-900 to-slate-900">
            <div className="mx-auto px-4 md:px-8 lg:px-12 py-8">
                {/* Back Link */}
                <Link
                    href={`/p/${practitionerSlug}`}
                    className="inline-flex items-center text-purple-300 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to {service.vendor.name}&apos;s Profile
                </Link>

                <Panel className="backdrop-blur-xl bg-white/95 shadow-2xl border-0">
                    <PanelHeader className="mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <PanelTitle as="h1" className="text-xl" data-testid="service-name">
                                        {service.name}
                                    </PanelTitle>
                                    <Badge className={getCategoryBadgeColor(service.category)}>
                                        {service.category}
                                    </Badge>
                                </div>
                                <PanelDescription className="flex flex-row gap-1 items-center">
                                    <span className="text-slate-500">Offered by</span>
                                    <span className="font-bold text-slate-700">{service.vendor.name}</span>
                                    <Link href={`/p/${practitionerSlug}`} className="text-sm text-purple-600 hover:underline">
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
                                <h2 className="text-lg font-semibold text-slate-800 mb-3">About This Service</h2>
                                <div className="text-slate-600 whitespace-pre-line" data-testid="service-description" dangerouslySetInnerHTML={{ __html: service.description }} />
                            </div>

                            {service.deliveryMode === "ASYNC" && service.turnaroundDays && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
                                    <Clock className="w-5 h-5 text-purple-600" />
                                    <span className="text-slate-700">
                                        Typical delivery: {service.turnaroundDays} {service.turnaroundDays === 1 ? 'day' : 'days'}
                                    </span>
                                </div>
                            )}

                            {service.deliveryFormats && service.deliveryFormats.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-slate-800 mb-2">Delivery Formats</h3>
                                    <ul className="space-y-2">
                                        {service.deliveryFormats.map((format, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <FileText className="w-4 h-4 mt-0.5 text-purple-600" />
                                                <div>
                                                    <div className="text-slate-700 font-medium">{format.format}</div>
                                                    {format.description && (
                                                        <div className="text-sm text-slate-500">{format.description}</div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {service.faq && service.faq.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-slate-800 mb-3">Frequently Asked Questions</h3>
                                    <Accordion type="single" collapsible>
                                        {service.faq.map((item) => (
                                            <AccordionItem key={item.id} value={item.id}>
                                                <AccordionTrigger className="text-slate-700">{item.title}</AccordionTrigger>
                                                <AccordionContent className="text-slate-600">
                                                    {item.description}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            )}

                            {service.terms && (
                                <div>
                                    <h3 className="text-md font-semibold text-slate-800 mb-2">Terms & Conditions</h3>
                                    <p className="text-sm text-slate-500 whitespace-pre-line">
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
                                    <Card>
                                        <CardContent className="py-8 text-center space-y-4">
                                            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                                                <Calendar className="w-8 h-8 text-green-600" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-800">Booking Request Sent!</h3>
                                            <p className="text-slate-600">
                                                Your booking request has been submitted. The practitioner will review and confirm your appointment soon.
                                            </p>
                                            <p className="text-sm text-slate-500">
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
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Select Your Option
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Fixed Price */}
                                    {service.pricing.type === "FIXED" && service.pricing.fixedPrice && (
                                        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50" data-testid="service-price">
                                            <div className="text-2xl font-bold text-purple-700">
                                                <CurrencySpan value={service.pricing.fixedPrice} withAnimation={false} />
                                            </div>
                                            <div className="text-sm text-slate-500">Fixed Price</div>
                                        </div>
                                    )}

                                    {/* Package Selection */}
                                    {service.pricing.type === "PACKAGE" && service.pricing.packages && (
                                        <div className="space-y-2" data-testid="service-price">
                                            <Label>Choose a Package</Label>
                                            {service.pricing.packages.map((pkg, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                        selectedPackage === idx
                                                            ? 'border-purple-500 bg-purple-50'
                                                            : 'border-slate-200 hover:border-purple-300'
                                                    }`}
                                                    onClick={() => setSelectedPackage(idx)}
                                                    data-testid={`package-option-${idx}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-semibold text-slate-800">{pkg.name}</div>
                                                            {pkg.description && (
                                                                <div className="text-sm text-slate-500">{pkg.description}</div>
                                                            )}
                                                            {pkg.sessions && (
                                                                <div className="text-sm text-slate-500">
                                                                    {pkg.sessions} sessions
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="font-bold text-purple-700">
                                                            <CurrencySpan value={pkg.price} withAnimation={false} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Hourly Rate */}
                                    {service.pricing.type === "HOURLY" && service.pricing.hourlyRate && (
                                        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50" data-testid="service-price">
                                            <div className="text-2xl font-bold text-purple-700">
                                                <CurrencySpan value={service.pricing.hourlyRate} withAnimation={false} />
                                            </div>
                                            <div className="text-sm text-slate-500">Per Hour</div>
                                        </div>
                                    )}

                                    {/* Add-ons */}
                                    {service.addOns && service.addOns.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="space-y-2">
                                                <Label>Add-Ons (Optional)</Label>
                                                {service.addOns.map((addOn) => (
                                                    <div
                                                        key={addOn.id}
                                                        className="flex items-start gap-2 p-2 rounded hover:bg-slate-50"
                                                    >
                                                        <Checkbox
                                                            checked={selectedAddOns.includes(addOn.id)}
                                                            onCheckedChange={() => toggleAddOn(addOn.id)}
                                                            data-testid={`addon-${addOn.id}`}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-medium text-slate-700">{addOn.name}</div>
                                                                    {addOn.description && (
                                                                        <div className="text-sm text-slate-500">{addOn.description}</div>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm font-semibold text-purple-700">
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
                                            <Separator />
                                            <div className="space-y-3">
                                                <Label>Intake Questionnaire</Label>
                                                {service.questionnaire.map((q) => (
                                                    <div key={q.id} className="space-y-2">
                                                        <Label htmlFor={q.id}>
                                                            {q.question}
                                                            {q.required && <span className="text-red-500 ml-1">*</span>}
                                                        </Label>

                                                        {q.type === "TEXT" && (
                                                            <Input
                                                                id={q.id}
                                                                value={(questionnaireResponses[q.id] as string) || ''}
                                                                onChange={(e) => setQuestionResponse(q.id, e.target.value)}
                                                                required={q.required}
                                                                data-testid={`questionnaire-${q.id}`}
                                                            />
                                                        )}

                                                        {q.type === "TEXTAREA" && (
                                                            <Textarea
                                                                id={q.id}
                                                                value={(questionnaireResponses[q.id] as string) || ''}
                                                                onChange={(e) => setQuestionResponse(q.id, e.target.value)}
                                                                required={q.required}
                                                                rows={4}
                                                                data-testid={`questionnaire-${q.id}`}
                                                            />
                                                        )}

                                                        {q.type === "SELECT" && q.options && (
                                                            <Select
                                                                value={(questionnaireResponses[q.id] as string) || ''}
                                                                onValueChange={(value) => setQuestionResponse(q.id, value)}
                                                            >
                                                                <SelectTrigger id={q.id} data-testid={`questionnaire-${q.id}`}>
                                                                    <SelectValue placeholder="Select an option" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {q.options.map((option) => (
                                                                        <SelectItem key={option} value={option}>
                                                                            {option}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}

                                                        {q.type === "MULTISELECT" && q.options && (
                                                            <div className="space-y-2">
                                                                {q.options.map((option) => (
                                                                    <div key={option} className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            id={`${q.id}-${option}`}
                                                                            checked={((questionnaireResponses[q.id] as string[]) || []).includes(option)}
                                                                            onCheckedChange={(checked) => {
                                                                                const current = (questionnaireResponses[q.id] as string[]) || [];
                                                                                const updated = checked
                                                                                    ? [...current, option]
                                                                                    : current.filter(x => x !== option);
                                                                                setQuestionResponse(q.id, updated);
                                                                            }}
                                                                        />
                                                                        <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                                                                            {option}
                                                                        </Label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    {/* Total & Add to Cart */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">Total</span>
                                            <span className="text-2xl font-bold text-purple-700">
                                                <CurrencySpan value={totalPrice} withAnimation={false} />
                                            </span>
                                        </div>

                                        {/* Birth Chart Gate for Astrology Readings */}
                                        {needsBirthChart ? (
                                            <Alert className="border-purple-300 bg-purple-50">
                                                <Stars className="h-4 w-4 text-purple-600" />
                                                <AlertTitle className="text-purple-800">Birth Chart Required</AlertTitle>
                                                <AlertDescription className="text-purple-700">
                                                    This astrology reading requires your birth chart. Please set up your birth chart first to continue.
                                                </AlertDescription>
                                                <Link href={`/u/${userId}/space/astrology/birth-chart?autoSetup=MEDIUMSHIP`}>
                                                    <Button
                                                        className="w-full mt-3"
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
                                            <Alert className="border-blue-300 bg-blue-50">
                                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                                <AlertTitle className="text-blue-800">Sign In Required</AlertTitle>
                                                <AlertDescription className="text-blue-700">
                                                    This astrology reading requires your birth chart. Please sign in to continue.
                                                </AlertDescription>
                                                <Link href="/">
                                                    <Button
                                                        className="w-full mt-3"
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
                                                className="w-full bg-purple-600 hover:bg-purple-700"
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
