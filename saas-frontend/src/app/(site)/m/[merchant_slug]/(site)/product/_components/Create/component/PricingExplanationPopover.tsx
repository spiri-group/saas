'use client'

import React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatCurrency } from "@/components/ux/CurrencySpan"

interface PricingExplanationPopoverProps {
  landedCost: number
  pricingStrategy: string
  tone: string
  currency: string
  finalPrice: number
  stockQuantity: number
  children: React.ReactNode
}

const PricingExplanationPopover: React.FC<PricingExplanationPopoverProps> = ({
  landedCost,
  pricingStrategy,
  tone,
  currency,
  finalPrice,
  stockQuantity,
  children
}) => {
  // Replicate the same sophisticated pricing algorithm from UpsertVariants
  const calculatePricingBreakdown = () => {
    if (landedCost <= 0) {
      return {
        effectiveCost: 0,
        targetEPU: 0,
        adjustedEPU: 0,
        netRate: 0,
        finalPrice: 0,
        refundCosts: 0,
        steps: []
      }
    }

    // Constants (same as in UpsertVariants)
    const refundRate = 0.08 // 8% expected refund rate
    const returnShipping = 600 // $6.00 in minor units
    const restockCost = 30 // $0.30 in minor units  
    const handlingCost = 50 // $0.50 in minor units
    const processingFeeRate = 0.029 // 2.9%
    const fixedFee = 30 // $0.30 in minor units
    const expectedDiscountRate = 0.05 // 5% average discount
    const taxRate = 0 // 0 if price shown before tax

    // Step 1: Calculate Effective Cost (EC)
    const refundCosts = refundRate * (returnShipping + restockCost + handlingCost)
    const effectiveCost = landedCost + refundCosts

    // Step 2: Calculate Expected Profit per Unit (EPU) based on strategy
    let targetEPU = 0
    const cushionMin = 100 // $1.00 minimum cushion
    const floorEPU = 50 // $0.50 floor
    let strategyDescription = ""

    switch (pricingStrategy) {
      case 'volume': // Sell more units
        const gamma = 0.075 // 7.5% margin
        targetEPU = Math.max(cushionMin, gamma * effectiveCost)
        strategyDescription = "Volume Focus: 7.5% margin to maximize units sold"
        break
      case 'unit-profit': // Steady profit per unit
        targetEPU = 600 // $6.00 target profit
        strategyDescription = "Unit Profit Focus: Target $6.00 profit per unit"
        break
      case 'revenue': // Hit sales target
        targetEPU = 500 // $5.00
        strategyDescription = "Revenue Focus: Target $5.00 profit to hit sales goals"
        break
      case 'inventory': // Clear stock quickly
        const inventoryGamma = 0.025 // 2.5% margin
        targetEPU = Math.max(floorEPU, inventoryGamma * effectiveCost)
        strategyDescription = "Inventory Focus: 2.5% margin to clear stock quickly"
        break
      case 'premium': // Premium positioning
        const alpha = 0.8 // 80% margin on effective cost
        targetEPU = alpha * effectiveCost
        strategyDescription = "Premium Focus: 80% margin for brand positioning"
        break
      case 'risk-averse': // Safe baseline
        const beta = 0.3 // 30% margin on effective cost
        targetEPU = beta * effectiveCost
        strategyDescription = "Risk-Averse Focus: 30% margin for safe baseline"
        break
      default:
        targetEPU = 600 // Default to unit-profit
        strategyDescription = "Default: Unit Profit Focus"
    }

    // Step 3: Apply tone adjustment to EPU
    let toneAdjustment = 1.0
    let toneDescription = ""
    switch (tone) {
      case 'push':
        toneAdjustment = 1.1 // +10% more aggressive
        toneDescription = "Push tone: +10% more aggressive pricing"
        break
      case 'ease':
        toneAdjustment = 0.9 // -10% more gentle
        toneDescription = "Ease tone: -10% more gentle pricing"
        break
      case 'normal':
      default:
        toneAdjustment = 1.0
        toneDescription = "Normal tone: No adjustment"
    }
    
    const adjustedEPU = targetEPU * toneAdjustment

    // Step 4: Calculate net rate and final price
    const netRate = 1 - processingFeeRate - taxRate - expectedDiscountRate
    const rawPrice = (adjustedEPU + effectiveCost + fixedFee) / netRate
    const calculatedFinalPrice = Math.round(rawPrice)

    return {
      effectiveCost,
      targetEPU,
      adjustedEPU,
      netRate,
      finalPrice: calculatedFinalPrice,
      strategyDescription,
      toneDescription,
      refundCosts,
      steps: [
        {
          title: "My Cost",
          value: landedCost,
          description: "Your total cost including shipping, duties, etc."
        },
        {
          title: "+ Refund Safety Net",
          value: refundCosts,
          description: `Small buffer for returns and restocking costs`
        },
        {
          title: "= Your True Cost",
          value: effectiveCost,
          description: "My cost + safety net → What it really costs you"
        },
        {
          title: "+ Your Profit Goal",
          value: adjustedEPU,
          description: `How much profit you want to make per sale${toneAdjustment !== 1.0 ? ` (${tone} intensity: ${toneAdjustment > 1 ? '+' : ''}${((toneAdjustment - 1) * 100).toFixed(0)}%)` : ''}`
        },
        {
          title: "+ Payment App Fees",
          value: fixedFee,
          description: "Buffer to cover credit card processing costs"
        },
        {
          title: "÷ Fee Adjustment",
          value: netRate,
          description: `Final tweak to make sure you get your profit after all fees (${(netRate * 100).toFixed(1)}% you keep)`
        }
      ]
    }
  }

  const breakdown = calculatePricingBreakdown()

  const getStrategyStory = (
    strategy: 'volume' | 'unit-profit' | 'inventory' | 'premium' | 'risk-averse',
    stock: number,
    cost: number,
    finalPrice: number,
    breakdown: { adjustedEPU: number; refundCosts: number },
    currency: string
  ) => {
    const perUnitProfit = Math.round(breakdown.adjustedEPU);                 // net profit / unit
    const totalRevenue = Math.round(finalPrice * stock);
    const totalProfit = Math.round(perUnitProfit * stock);

    // Forecast (for context only)
    const expectedRefundRate = 0.08;
    const expectedRefunds = Math.max(0, Math.round(stock * expectedRefundRate));

    // Real refund risk: how many full-price refunds would wipe out all profit?
    // Each refund: you pay back finalPrice, get back landedCost worth of product
    const netLossPerRefund = finalPrice - cost; // Net cash loss per refund
    const refundsToZeroProfit = netLossPerRefund > 0 ? Math.max(1, Math.floor(totalProfit / netLossPerRefund)) : stock;

    // Helper
    const s = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

    const stories = {
      'volume': (
        <div className="space-y-3">
          <p>You&apos;ve got <span className="text-blue-600 font-semibold">{s(stock, 'unit')} ready to move</span>.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalProfit, currency)}</div>
              <div className="text-sm font-semibold text-green-600">Total Profit</div>
              <div className="text-xs text-green-600 mt-1">{formatCurrency(perUnitProfit, currency)} per unit × {stock} units</div>
              <div className="text-xs text-gray-500 mt-1">Sales: {formatCurrency(totalRevenue, currency)}</div>
            </div>
          </div>
          <p><span className="text-orange-600 font-semibold">Heads-up:</span> with only {formatCurrency(perUnitProfit, currency)} per unit, about <span className="font-semibold">~{refundsToZeroProfit}</span> {refundsToZeroProfit === 1 ? 'refund' : 'refunds'} would erase total profit.</p>
          <p><span className="text-orange-600 font-semibold">Why choose this?</span> Faster sales → quicker turnover → stronger cash flow.</p>
          <p className="text-xs text-muted-foreground italic">I&apos;ll keep tuning the balance between speed and refund risk.</p>
        </div>
      ),

      'unit-profit': (
        <div className="space-y-3">
          <p><span className="text-blue-600 font-semibold">Every unit nets {formatCurrency(perUnitProfit, currency)} profit</span>.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalProfit, currency)}</div>
              <div className="text-sm font-semibold text-green-600">Total Profit</div>
              <div className="text-xs text-green-600 mt-1">{formatCurrency(perUnitProfit, currency)} per unit × {stock} units</div>
              <div className="text-xs text-gray-500 mt-1">Sales: {formatCurrency(totalRevenue, currency)}</div>
            </div>
          </div>
          <p><span className="text-blue-600">Coverage check:</span> your profit pool can absorb about <span className="font-semibold">~{refundsToZeroProfit}</span> {refundsToZeroProfit === 1 ? 'refund' : 'refunds'} before profit hits zero. If refunds rise past ~<span className="font-semibold">{expectedRefunds}</span>, profit may dip.</p>
          <p><span className="text-purple-600 font-semibold">Focus: predictability</span>.</p>
          <p className="text-xs text-muted-foreground italic">I&apos;ll keep improving how I protect that steady margin.</p>
        </div>
      ),

      'inventory': (
        <div className="space-y-3">
          <p>You&apos;ve got <span className="text-amber-600 font-semibold">{s(stock, 'unit')} sitting on the shelf</span>.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalProfit, currency)}</div>
              <div className="text-sm font-semibold text-green-600">Total Profit</div>
              <div className="text-xs text-green-600 mt-1">{formatCurrency(perUnitProfit, currency)} per unit × {stock} units</div>
              <div className="text-xs text-gray-500 mt-1">Sales: {formatCurrency(totalRevenue, currency)}</div>
            </div>
          </div>
          <p><span className="text-amber-600 font-semibold">Trade-off:</span> slimmer cushion, faster clearance. Prioritises cash flow over max margin.</p>
          <p><span className="text-red-600 font-semibold">Goal: Clear shelves fast</span> and free up cash.</p>
          <p className="text-xs text-muted-foreground italic">I&apos;m learning daily to make these calls smarter.</p>
        </div>
      ),

      'premium': (
        <div className="space-y-3">
          <p>This price <span className="text-purple-600 font-semibold">signals premium quality</span> and leans into value.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalProfit, currency)}</div>
              <div className="text-sm font-semibold text-green-600">Total Profit</div>
              <div className="text-xs text-green-600 mt-1">{formatCurrency(perUnitProfit, currency)} per unit × {stock} units</div>
              <div className="text-xs text-gray-500 mt-1">Sales: {formatCurrency(totalRevenue, currency)}</div>
            </div>
          </div>
          <p><span className="text-purple-600">Premium advantage:</span> you’d need roughly <span className="font-semibold">~{refundsToZeroProfit}</span> {refundsToZeroProfit === 1 ? 'refund' : 'refunds'} to wipe out profit. The typical rate is about <span className="font-semibold">~{expectedRefunds}</span>, so you’re well covered.</p>
          <p><span className="text-indigo-600 font-semibold">Aim: strong per-unit returns that support your brand</span>.</p>
          <p className="text-xs text-muted-foreground italic">I&apos;ll keep refining the balance between price, perception, and profit.</p>
        </div>
      ),

      'risk-averse': (
        <div className="space-y-3">
          <p><span className="text-green-600 font-semibold">Safety-first play</span>.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalProfit, currency)}</div>
              <div className="text-sm font-semibold text-green-600">Total Profit</div>
              <div className="text-xs text-green-600 mt-1">{formatCurrency(perUnitProfit, currency)} per unit × {stock} units</div>
              <div className="text-xs text-gray-500 mt-1">Sales: {formatCurrency(totalRevenue, currency)}</div>
            </div>
          </div>
          <p><span className="text-green-600">Safety net:</span> even if refunds climb from ~{expectedRefunds} toward <span className="font-semibold">~{refundsToZeroProfit}</span>, margins aim to keep you in the green.</p>
          <p><span className="text-slate-700 font-semibold">The steady, sleep-well-at-night option</span>.</p>
          <p className="text-xs text-muted-foreground italic">I&apos;ll keep finding ways to stay safe while protecting returns.</p>
        </div>
      )
    } as const;

    return stories[strategy] ?? `With ${s(stock, 'unit')} in stock, we've priced this to balance profit and sales velocity for your situation.`;
  };


  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm mb-1">Why we chose this price for you</h3>
            <p className="text-xs text-muted-foreground">Based on your {pricingStrategy.replace('-', ' ')} strategy</p>
          </div>

          {/* Strategy story */}
          <div className="bg-muted/50 border rounded-lg p-4">
            <div className="prose prose-xs text-foreground leading-relaxed max-w-none">
              {getStrategyStory(pricingStrategy as 'volume' | 'unit-profit' | 'inventory' | 'premium' | 'risk-averse', stockQuantity, landedCost, finalPrice, breakdown, currency)}
            </div>
          </div>

          {/* Signature line */}
          <div className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
            Your sales coach (I&apos;m free today for pricing — look out for my premium side when you&apos;re ready to tackle sales strategy too)
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default PricingExplanationPopover