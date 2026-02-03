'use client'

import React, { useState } from "react"
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
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
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import UseServiceDetails from "./hooks/UseServiceDetails";
import UseAddServiceToCart from "./hooks/UseAddServiceToCart";
import { useBirthChart } from "@/app/(site)/u/[userId]/space/astrology/_hooks/useBirthChart";
import { Clock, FileText, Package, Stars, AlertCircle } from "lucide-react";

type BLProps = {
    merchantId: string,
    serviceSlug: string,
}

type Props = BLProps & {}

type QuestionnaireResponses = Record<string, string | string[]>;

const useBL = (props: BLProps) => {
    const session = useSession()
    const service = UseServiceDetails(props.merchantId, props.serviceSlug)
    const vendorBranding = useMerchantTheme(props.merchantId)
    const addToCart = UseAddServiceToCart()
    const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
    const [questionnaireResponses, setQuestionnaireResponses] = useState<QuestionnaireResponses>({})

    // Check if this is an astrology reading that requires birth chart
    const isAstrologyReading = service.data?.readingOptions?.readingType === 'Astrology'
    const userId = session.data?.user?.id as string | undefined

    // Only fetch birth chart if this is an astrology service and user is logged in
    const birthChartQuery = useBirthChart(userId || '')
    const hasBirthChart = !!birthChartQuery.data
    const birthChartLoading = birthChartQuery.isLoading && isAstrologyReading && !!userId

    // Birth chart is required for astrology readings
    const needsBirthChart = isAstrologyReading && userId && !hasBirthChart && !birthChartLoading

    const handleAddToCart = () => {
        if (!service.data) return;

        const questionnaireResponsesArray = Object.entries(questionnaireResponses).map(([questionId, answer]) => {
            const question = service.data!.questionnaire?.find(q => q.id === questionId);
            return {
                questionId,
                question: question?.question || '',
                answer: Array.isArray(answer) ? answer.join(', ') : answer
            };
        });

        addToCart.mutate({
            serviceId: service.data!.id,
            questionnaireResponses: questionnaireResponsesArray.length > 0 ? questionnaireResponsesArray : undefined,
            selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined
        });
    };

    return {
        service: service.data,
        vendorBranding: vendorBranding.data,
        selectedPackage: {
            index: selectedPackage,
            setIndex: setSelectedPackage
        },
        selectedAddOns: {
            value: selectedAddOns,
            toggle: (id: string) => {
                setSelectedAddOns(prev =>
                    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                )
            }
        },
        questionnaire: {
            responses: questionnaireResponses,
            setResponse: (questionId: string, value: string | string[]) => {
                setQuestionnaireResponses(prev => ({ ...prev, [questionId]: value }))
            }
        },
        addToCart: {
            mutate: handleAddToCart,
            isPending: addToCart.isPending
        },
        // Birth chart gate
        isAstrologyReading,
        needsBirthChart,
        birthChartLoading,
        userId,
        isLoggedIn: session.status === 'authenticated'
    }
}

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.vendorBranding || !bl.service) return null;

    const fontConfig = bl.vendorBranding.vendor.font ? {
        brand: bl.vendorBranding.vendor.font.brand?.family || 'clean',
        default: bl.vendorBranding.vendor.font.default?.family || 'clean',
        headings: bl.vendorBranding.vendor.font.headings?.family || 'clean',
        accent: bl.vendorBranding.vendor.font.accent?.family || 'clean'
    } : undefined;

    const getCategoryBadgeColor = (category: string) => {
        switch (category) {
            case "READING": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
            case "HEALING": return "bg-green-500/20 text-green-300 border-green-500/30";
            case "COACHING": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
            default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
        }
    };

    // Service is guaranteed to be defined after the guard above
    const service = bl.service;

    const calculateTotalPrice = () => {
        let total = 0;

        if (service.pricing.type === "FIXED" && service.pricing.fixedPrice) {
            total = service.pricing.fixedPrice.amount;
        } else if (service.pricing.type === "PACKAGE" && bl.selectedPackage.index !== null && service.pricing.packages) {
            total = service.pricing.packages[bl.selectedPackage.index].price.amount;
        } else if (service.pricing.type === "HOURLY" && service.pricing.hourlyRate) {
            total = service.pricing.hourlyRate.amount;
        }

        bl.selectedAddOns.value.forEach(addOnId => {
            const addOn = service.addOns?.find(a => a.id === addOnId);
            if (addOn) total += addOn.price.amount;
        });

        return { amount: total, currency: service.pricing.fixedPrice?.currency || service.pricing.packages?.[0]?.price.currency || service.pricing.hourlyRate?.currency || "USD" };
    };

    const totalPrice = calculateTotalPrice();

    return (
        <div className="flex flex-col space-y-2 ml-2 mr-2"
            style={{
                background: 'rgb(var(--merchant-background, 248, 250, 252))',
                backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
                minHeight: '100vh'
            }}>
            <MerchantFontLoader fonts={fontConfig} />

            <Panel className="mt-2"
                style={{
                    backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                    color: `rgb(var(--merchant-panel-primary-foreground))`,
                    borderColor: `rgb(var(--merchant-primary), 0.2)`,
                    boxShadow: `var(--shadow-merchant-lg)`
                }}>
                <PanelHeader className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <PanelTitle as="h1" className="text-xl text-merchant-headings-foreground">
                                    {service.name}
                                </PanelTitle>
                                <Badge className={getCategoryBadgeColor(service.category)}>
                                    {service.category}
                                </Badge>
                            </div>
                            <PanelDescription className="flex flex-row gap-1 items-center">
                                <span className="text-merchant-default-foreground/70">Offered by</span>
                                <span className="text-merchant-default-foreground font-bold text-md">{service.vendor.name}</span>
                                <Link href={`/m/${service.vendor.slug}`} className="text-sm text-merchant-links hover:underline">Visit Profile</Link>
                            </PanelDescription>
                        </div>
                    </div>
                </PanelHeader>

                <PanelContent className="flex flex-col lg:flex-row gap-6">
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
                            <h2 className="text-lg font-semibold text-merchant-headings-foreground mb-3">About This Service</h2>
                            <p className="text-merchant-default-foreground/90 whitespace-pre-line">
                                {service.description}
                            </p>
                        </div>

                        {service.deliveryMode === "ASYNC" && service.turnaroundDays && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-merchant-primary/5 border border-merchant-primary/20">
                                <Clock className="w-5 h-5 text-merchant-primary" />
                                <span className="text-merchant-default-foreground">
                                    Typical delivery: {service.turnaroundDays} {service.turnaroundDays === 1 ? 'day' : 'days'}
                                </span>
                            </div>
                        )}

                        {service.deliveryFormats && service.deliveryFormats.length > 0 && (
                            <div>
                                <h3 className="text-md font-semibold text-merchant-headings-foreground mb-2">Delivery Formats</h3>
                                <ul className="space-y-2">
                                    {service.deliveryFormats.map((format, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <FileText className="w-4 h-4 mt-0.5 text-merchant-primary" />
                                            <div>
                                                <div className="text-merchant-default-foreground font-medium">{format.format}</div>
                                                {format.description && (
                                                    <div className="text-sm text-merchant-default-foreground/70">{format.description}</div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {service.faq && service.faq.length > 0 && (
                            <div>
                                <h3 className="text-md font-semibold text-merchant-headings-foreground mb-3">Frequently Asked Questions</h3>
                                <Accordion type="single" collapsible>
                                    {service.faq.map((item) => (
                                        <AccordionItem key={item.id} value={item.id}>
                                            <AccordionTrigger className="text-merchant-default-foreground">{item.title}</AccordionTrigger>
                                            <AccordionContent className="text-merchant-default-foreground/80">
                                                {item.description}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        )}

                        {service.terms && (
                            <div>
                                <h3 className="text-md font-semibold text-merchant-headings-foreground mb-2">Terms & Conditions</h3>
                                <p className="text-sm text-merchant-default-foreground/70 whitespace-pre-line">
                                    {service.terms}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="lg:w-96 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Select Your Option
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {service.pricing.type === "FIXED" && service.pricing.fixedPrice && (
                                    <div className="p-4 rounded-lg border border-merchant-primary/30 bg-merchant-primary/5">
                                        <div className="text-2xl font-bold text-merchant-primary">
                                            <CurrencySpan value={service.pricing.fixedPrice} withAnimation={false} />
                                        </div>
                                        <div className="text-sm text-merchant-default-foreground/70">Fixed Price</div>
                                    </div>
                                )}

                                {service.pricing.type === "PACKAGE" && service.pricing.packages && (
                                    <div className="space-y-2">
                                        <Label>Choose a Package</Label>
                                        {service.pricing.packages.map((pkg, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                    bl.selectedPackage.index === idx
                                                        ? 'border-merchant-primary bg-merchant-primary/10'
                                                        : 'border-merchant-primary/20 hover:border-merchant-primary/40'
                                                }`}
                                                onClick={() => bl.selectedPackage.setIndex(idx)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-semibold text-merchant-default-foreground">{pkg.name}</div>
                                                        {pkg.description && (
                                                            <div className="text-sm text-merchant-default-foreground/70">{pkg.description}</div>
                                                        )}
                                                        {pkg.sessions && (
                                                            <div className="text-sm text-merchant-default-foreground/70">
                                                                {pkg.sessions} sessions
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-merchant-primary">
                                                        <CurrencySpan value={pkg.price} withAnimation={false} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {service.pricing.type === "HOURLY" && service.pricing.hourlyRate && (
                                    <div className="p-4 rounded-lg border border-merchant-primary/30 bg-merchant-primary/5">
                                        <div className="text-2xl font-bold text-merchant-primary">
                                            <CurrencySpan value={service.pricing.hourlyRate} withAnimation={false} />
                                        </div>
                                        <div className="text-sm text-merchant-default-foreground/70">Per Hour</div>
                                    </div>
                                )}

                                {service.addOns && service.addOns.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <Label>Add-Ons (Optional)</Label>
                                            {service.addOns.map((addOn) => (
                                                <div
                                                    key={addOn.id}
                                                    className="flex items-start gap-2 p-2 rounded hover:bg-merchant-primary/5"
                                                >
                                                    <Checkbox
                                                        checked={bl.selectedAddOns.value.includes(addOn.id)}
                                                        onCheckedChange={() => bl.selectedAddOns.toggle(addOn.id)}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="font-medium text-merchant-default-foreground">{addOn.name}</div>
                                                                {addOn.description && (
                                                                    <div className="text-sm text-merchant-default-foreground/70">{addOn.description}</div>
                                                                )}
                                                            </div>
                                                            <div className="text-sm font-semibold text-merchant-primary">
                                                                +<CurrencySpan value={addOn.price} withAnimation={false} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

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
                                                            value={(bl.questionnaire.responses[q.id] as string) || ''}
                                                            onChange={(e) => bl.questionnaire.setResponse(q.id, e.target.value)}
                                                            required={q.required}
                                                        />
                                                    )}

                                                    {q.type === "TEXTAREA" && (
                                                        <Textarea
                                                            id={q.id}
                                                            value={(bl.questionnaire.responses[q.id] as string) || ''}
                                                            onChange={(e) => bl.questionnaire.setResponse(q.id, e.target.value)}
                                                            required={q.required}
                                                            rows={4}
                                                        />
                                                    )}

                                                    {q.type === "SELECT" && q.options && (
                                                        <Select
                                                            value={(bl.questionnaire.responses[q.id] as string) || ''}
                                                            onValueChange={(value) => bl.questionnaire.setResponse(q.id, value)}
                                                        >
                                                            <SelectTrigger id={q.id}>
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
                                                                        checked={((bl.questionnaire.responses[q.id] as string[]) || []).includes(option)}
                                                                        onCheckedChange={(checked) => {
                                                                            const current = (bl.questionnaire.responses[q.id] as string[]) || [];
                                                                            const updated = checked
                                                                                ? [...current, option]
                                                                                : current.filter(x => x !== option);
                                                                            bl.questionnaire.setResponse(q.id, updated);
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

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-merchant-default-foreground">Total</span>
                                        <span className="text-2xl font-bold text-merchant-primary">
                                            <CurrencySpan value={totalPrice} withAnimation={false} />
                                        </span>
                                    </div>

                                    {/* Birth Chart Gate for Astrology Readings */}
                                    {bl.needsBirthChart ? (
                                        <Alert className="border-purple-500/30 bg-purple-500/10">
                                            <Stars className="h-4 w-4 text-purple-400" />
                                            <AlertTitle className="text-purple-300">Birth Chart Required</AlertTitle>
                                            <AlertDescription className="text-purple-200/80">
                                                This astrology reading requires your birth chart. Please set up your birth chart first to continue.
                                            </AlertDescription>
                                            <Link href={`/u/${bl.userId}/space/astrology/birth-chart?autoSetup=MEDIUMSHIP`}>
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
                                    ) : bl.isAstrologyReading && !bl.isLoggedIn ? (
                                        <Alert className="border-blue-500/30 bg-blue-500/10">
                                            <AlertCircle className="h-4 w-4 text-blue-400" />
                                            <AlertTitle className="text-blue-300">Sign In Required</AlertTitle>
                                            <AlertDescription className="text-blue-200/80">
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
                                    ) : bl.birthChartLoading ? (
                                        <Button
                                            className="w-full"
                                            size="lg"
                                            disabled
                                        >
                                            Checking birth chart...
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            size="lg"
                                            onClick={bl.addToCart.mutate}
                                            disabled={bl.addToCart.isPending}
                                            data-testid="add-to-cart-btn"
                                        >
                                            {bl.addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </PanelContent>
            </Panel>
        </div>
    )
}

export default UI;
