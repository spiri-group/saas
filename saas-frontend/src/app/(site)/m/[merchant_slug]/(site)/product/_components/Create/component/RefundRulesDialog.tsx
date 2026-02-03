'use client'

import React, { useEffect } from 'react'
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormControl } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import CurrencyInput from "@/components/ux/CurrencyInput"
import { Badge } from "@/components/ui/badge"
import { CameraIcon, ClockIcon, RotateCcwIcon, DollarSignIcon } from "lucide-react"

interface RefundRulesDialogProps {
  merchantId: string
  merchantCurrency: string
}

const RefundRulesDialog: React.FC<RefundRulesDialogProps> = ({
  merchantCurrency
}) => {
  const { control, watch, setValue } = useFormContext()
  const variants = watch('variants') || []

  // Watch form values for dynamic logic
  const allowAutoReturns = watch('refundRules.allowAutoReturns')
  const maxShippingCost = watch('refundRules.maxShippingCost')
  const refundWithoutReturn = watch('refundRules.refundWithoutReturn')
  const requirePhoto = watch('refundRules.requirePhoto')
  const refundTiming = watch('refundRules.refundTiming')

  // Calculate product metrics for tip
  const calculateProductMetrics = () => {
    if (!variants || variants.length === 0) {
      return null
    }

    const validVariants = variants.filter((v: any) => 
      v.landedCost?.amount > 0 && v.defaultPrice?.amount > 0
    )

    if (validVariants.length === 0) {
      return null
    }

    const avgCost = validVariants.reduce((sum: number, v: any) => sum + (v.landedCost?.amount || 0), 0) / validVariants.length
    const avgPrice = validVariants.reduce((sum: number, v: any) => sum + (v.defaultPrice?.amount || 0), 0) / validVariants.length
    const avgProfit = avgPrice - avgCost

    // Convert from minor currency units to major units for display
    const costMajor = avgCost / 100
    const priceMajor = avgPrice / 100
    const profitMajor = avgProfit / 100

    // Calculate suggested range (20-40% of cost)
    const suggestedLow = (avgCost * 0.2) / 100
    const suggestedHigh = (avgCost * 0.4) / 100

    return {
      avgCost: costMajor,
      avgPrice: priceMajor, 
      avgProfit: profitMajor,
      suggestedLow,
      suggestedHigh
    }
  }

  const productMetrics = calculateProductMetrics()

  // Calculate units to recover shipping cost
  const calculateRecoveryUnits = () => {
    if (!productMetrics || !maxShippingCost?.amount) {
      return null
    }

    const shippingCostMajor = maxShippingCost.amount / 100
    const unitsToRecover = Math.ceil(shippingCostMajor / productMetrics.avgProfit)
    
    return unitsToRecover
  }

  const recoveryUnits = calculateRecoveryUnits()

  // Set recommended defaults on mount
  useEffect(() => {
    if (allowAutoReturns === undefined) {
      setValue('refundRules.allowAutoReturns', true)
    }
    if (!maxShippingCost) {
      setValue('refundRules.maxShippingCost', { amount: 1000, currency: merchantCurrency }) // $10
    }
    if (requirePhoto === undefined) {
      setValue('refundRules.requirePhoto', false)
    }
    if (!refundTiming) {
      setValue('refundRules.refundTiming', 'carrier_scan')
    }
    if (refundWithoutReturn === undefined) {
      setValue('refundRules.refundWithoutReturn', true)
    }
  }, [setValue, merchantCurrency, allowAutoReturns, maxShippingCost, requirePhoto, refundTiming, refundWithoutReturn])

  const getRecommendedBadge = (isRecommended: boolean) => {
    return isRecommended ? (
      <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">
        ✅ Recommended
      </Badge>
    ) : null
  }

  return (
    <div className="flex flex-col flex-grow min-h-0">
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcwIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Refund Rules Summary</h2>
        </div>
      </div>

      {/* Settings Summary - Sticky */}
      <div className="flex-shrink-0 px-6 pb-4 sticky top-0 z-10">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Current Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="font-medium">Auto returns:</span>
                  <span className="ml-2">✅ Yes</span>
                </div>
                <div>
                  <span className="font-medium">Max shipping refund:</span>
                  <span className="ml-2">$10</span>
                </div>
                <div>
                  <span className="font-medium">Require photo:</span>
                  <span className="ml-2">{requirePhoto ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div>
                  <span className="font-medium">Refund timing:</span>
                  <span className="ml-2">
                    {requirePhoto
                      ? 'Manual release (Required)'
                      : refundTiming === 'immediate'
                        ? 'Immediate'
                        : refundTiming === 'carrier_scan'
                          ? 'After carrier scan'
                          : refundTiming === 'delivered'
                            ? 'After delivery'
                            : 'Manual release'
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6">
        {/* 1. Allow Automatic Returns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <RotateCcwIcon className="h-4 w-4 mr-2 text-blue-600" />
              1. Allow Automatic Returns
            </CardTitle>
            <CardDescription>
              Do you want us to automatically handle returns and refunds for this product?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="refundRules.allowAutoReturns"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup 
                      value={field.value ? "yes" : "no"} 
                      onValueChange={(value) => field.onChange(value === "yes")}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="auto-yes" />
                        <label htmlFor="auto-yes" className="text-sm font-medium">
                          ✅ Yes – We&apos;ll auto-approve valid return requests and manage the refund process
                          {getRecommendedBadge(true)}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="auto-no" />
                        <label htmlFor="auto-no" className="text-sm">
                          ❌ No – You&apos;ll review and approve each return manually
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 2. Max Return Shipping Cost - Only shown for automatic returns */}
        {allowAutoReturns && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSignIcon className="h-4 w-4 mr-2 text-green-600" />
              2. Max Return Shipping Cost for Automatic Returns
            </CardTitle>
            <CardDescription>
              What&apos;s the highest shipping cost you&apos;ll pay to get this item returned?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="refundRules.maxShippingCost"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <CurrencyInput
                        {...field}
                        className="w-32"
                        placeholder="10.00"
                        decimalLimit={2}
                      />
                      <div className="text-sm text-muted-foreground">
                        {productMetrics ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span>💡 <strong>Tip:</strong></span>
                            </div>
                            <div className="text-xs space-y-1 bg-blue-50 border border-blue-200 rounded p-3">
                              <div>Your average cost is <strong>${productMetrics.avgCost.toFixed(2)}</strong>, typical sale price is <strong>${productMetrics.avgPrice.toFixed(2)}</strong>, and average profit is <strong>${productMetrics.avgProfit.toFixed(2)}</strong>.</div>
                              <div>Many merchants cap return shipping at 20–40% of cost (≈ <strong>${productMetrics.suggestedLow.toFixed(2)}–${productMetrics.suggestedHigh.toFixed(2)}</strong>), or about half their profit.</div>
                              {recoveryUnits && maxShippingCost?.amount && (
                                <div className="mt-2 pt-2 border-t border-blue-300">
                                  <strong>Impact:</strong> At ${(maxShippingCost.amount / 100).toFixed(2)} max shipping cost, you&apos;d need to sell <strong>{recoveryUnits} unit{recoveryUnits > 1 ? 's' : ''}</strong> to recover each shipping refund.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span>🛡 Set a reasonable limit to protect your profit margins</span>
                        )}
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        )}

        {/* Refund Without Return */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <RotateCcwIcon className="h-4 w-4 mr-2 text-purple-600" />
              {allowAutoReturns ? '3' : '2'}. Refund Without Return if Return Shipping Is Too Expensive?
            </CardTitle>
            <CardDescription>
              If return shipping is more than the product&apos;s value, should we just refund the customer?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="refundRules.refundWithoutReturn"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup 
                      value={field.value ? "yes" : "no"} 
                      onValueChange={(value) => field.onChange(value === "yes")}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="refund-yes" />
                        <label htmlFor="refund-yes" className="text-sm font-medium">
                          ✅ Yes – Refund the customer, don&apos;t require return
                          {getRecommendedBadge(true)}
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="refund-no" />
                        <label htmlFor="refund-no" className="text-sm">
                          ❌ No – Always require the item to be returned
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Require Photo Proof */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <CameraIcon className="h-4 w-4 mr-2 text-indigo-600" />
              {allowAutoReturns ? '4' : '3'}. Require Photo Proof?
            </CardTitle>
            <CardDescription>
              Should customers upload a photo for return reasons? 
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                📌 <strong>Note:</strong> Photo proof is always required when customers report items as damaged or faulty. This setting controls whether photos are needed for other return reasons (e.g., wrong size, changed mind, etc.)
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="refundRules.requirePhoto"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup 
                      value={field.value ? "yes" : "no"} 
                      onValueChange={(value) => {
                        const isPhotoRequired = value === "yes";
                        field.onChange(isPhotoRequired);
                        // If photo required, force manual timing
                        if (isPhotoRequired) {
                          setValue('refundRules.refundTiming', 'manual');
                        } else {
                          // Reset to default if not requiring photo
                          setValue('refundRules.refundTiming', 'carrier_scan');
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="photo-yes" />
                        <label htmlFor="photo-yes" className="text-sm font-medium">
                          ✅ Yes – Require photo proof for return reasons
                          <div className="text-xs text-muted-foreground ml-6 mt-1">
                            Photos required for: damaged/faulty + wrong size + changed mind + all other reasons
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="photo-no" />
                        <label htmlFor="photo-no" className="text-sm font-medium">
                          ❌ No – Photos only for damaged/faulty items
                          {getRecommendedBadge(true)}
                          <div className="text-xs text-muted-foreground ml-6 mt-1">
                            Photos required for: damaged/faulty only. Other reasons are trust-based.
                          </div>
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Refund Timing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-green-600" />
              {allowAutoReturns ? '5' : '4'}. When Should the Refund Be Released?
            </CardTitle>
            <CardDescription>
              When should we actually issue the refund?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="refundRules.refundTiming"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    {requirePhoto ? (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">
                            🔘 Manual release required – Photo verification requires manual approval
                          </span>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          Since you require photo proof, refunds must be manually released after you verify the photos.
                        </p>
                      </div>
                    ) : (
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="immediate" id="timing-immediate" />
                          <label htmlFor="timing-immediate" className="text-sm">
                            🔘 Immediately when return is approved
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="carrier_scan" id="timing-scan" />
                          <label htmlFor="timing-scan" className="text-sm font-medium">
                            🔘 When return is scanned by the carrier
                            {getRecommendedBadge(true)}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="delivered" id="timing-delivered" />
                          <label htmlFor="timing-delivered" className="text-sm">
                            🔘 When return is delivered to you
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="manual" id="timing-manual" />
                          <label htmlFor="timing-manual" className="text-sm">
                            🔘 Only after you manually click &quot;Release Funds&quot;
                          </label>
                        </div>
                      </RadioGroup>
                    )}
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default RefundRulesDialog