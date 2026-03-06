"use client";

import { Check, X, Info } from "lucide-react";

type Feature = {
    name: string;
    directory: boolean | string;
    awaken: boolean | string;
    illuminate: boolean | string;
    manifest: boolean | string;
    transcend: boolean | string;
};

const FEATURE_GROUPS: { group: string; features: Feature[] }[] = [
    {
        group: "Core",
        features: [
            { name: "Directory listing", directory: true, awaken: true, illuminate: true, manifest: true, transcend: true },
            { name: "SpiriAssist", directory: true, awaken: true, illuminate: true, manifest: true, transcend: true },
            { name: "Gallery", directory: true, awaken: true, illuminate: true, manifest: true, transcend: true },
        ],
    },
    {
        group: "Practitioner",
        features: [
            { name: "Accept payments", directory: false, awaken: true, illuminate: true, manifest: true, transcend: true },
            { name: "Video updates + Followers", directory: false, awaken: true, illuminate: true, manifest: true, transcend: true },
            { name: "Sell Services + Availability", directory: false, awaken: true, illuminate: true, manifest: true, transcend: true },
            { name: "SpiriReadings", directory: false, awaken: true, illuminate: true, manifest: true, transcend: true },
        ],
    },
    {
        group: "Growth",
        features: [
            { name: "Payment Links (SMS, Email)", directory: false, awaken: false, illuminate: true, manifest: true, transcend: true },
            { name: "Ticketed Events", directory: false, awaken: false, illuminate: true, manifest: true, transcend: true },
            { name: "Live Assist", directory: false, awaken: false, illuminate: true, manifest: true, transcend: true },
            { name: "Expo Mode", directory: false, awaken: false, illuminate: true, manifest: true, transcend: true },
            { name: "Tour Listing + Selling", directory: false, awaken: false, illuminate: true, manifest: true, transcend: true },
        ],
    },
    {
        group: "Merchant",
        features: [
            { name: "Merchant Profile", directory: false, awaken: false, illuminate: false, manifest: true, transcend: true },
            { name: "Products", directory: false, awaken: false, illuminate: false, manifest: "20", transcend: "Unlimited" },
            { name: "Inventory sync", directory: false, awaken: false, illuminate: false, manifest: true, transcend: true },
            { name: "Host practitioners", directory: false, awaken: false, illuminate: false, manifest: true, transcend: true },
            { name: "Tour Operation", directory: false, awaken: false, illuminate: false, manifest: true, transcend: true },
        ],
    },
    {
        group: "Enterprise",
        features: [
            { name: "Refund automation", directory: false, awaken: false, illuminate: false, manifest: false, transcend: true },
            { name: "Shipping labels + tracking", directory: false, awaken: false, illuminate: false, manifest: false, transcend: true },
            { name: "POS + stock sync", directory: false, awaken: false, illuminate: false, manifest: false, transcend: true },
            { name: "Backorders", directory: false, awaken: false, illuminate: false, manifest: false, transcend: true },
        ],
    },
];

const TIERS = [
    { key: "directory", label: "Directory", price: 9, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    { key: "awaken", label: "Awaken", price: 19, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
    { key: "illuminate", label: "Illuminate", price: 29, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { key: "manifest", label: "Manifest", price: 39, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { key: "transcend", label: "Transcend", price: 59, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
] as const;

type Competitor = {
    name: string;
    entry: string;
    mid: string;
    top: string;
    model: string;
    notes: string;
};

const COMPETITORS: Competitor[] = [
    { name: "Mindbody", entry: "$129/mo", mid: "$269/mo", top: "$599/mo", model: "Per-location", notes: "Widely criticised for price hikes and hidden fees. Dominant in fitness/wellness scheduling." },
    { name: "Square Appointments", entry: "Free (solo)", mid: "$49/mo", top: "$149/mo", model: "Per-location", notes: "Generic scheduling + payments. No spiritual marketplace or directory." },
    { name: "Vagaro", entry: "$24/mo", mid: "$30-90/mo", top: "$90+/mo", model: "Per-calendar + add-ons", notes: "Add-ons for forms, storage, text marketing, branded apps all cost extra." },
    { name: "Heallist", entry: "Free (basic)", mid: "$24/mo", top: "$24/mo", model: "Flat + booking fees on free", notes: "Closest spiritual-specific competitor. Purely a booking platform \u2014 no products, POS, events, or tours." },
    { name: "Insight Timer", entry: "Free (teacher)", mid: "$10/mo (user)", top: "\u2014", model: "Consumer subscription", notes: "Meditation focused. Teacher tools are limited. Not a full practitioner platform." },
];

function CellValue({ value }: { value: boolean | string }) {
    if (value === true) return <Check className="h-4 w-4 text-green-400 mx-auto" />;
    if (value === false) return <X className="h-4 w-4 text-slate-600 mx-auto" />;
    return <span className="text-sm font-medium text-white">{value}</span>;
}

export default function PricingReference() {
    return (
        <div className="h-full overflow-y-auto p-6 space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-console">Pricing &amp; Feature Matrix</h2>
                <p className="text-sm text-console-muted mt-1">
                    Internal reference for subscription tiers and competitive positioning.
                </p>
            </div>

            {/* Pricing Table */}
            <div className="console-surface border border-console rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-console">
                            <th className="text-left px-4 py-3 text-console-muted font-medium w-56">Feature</th>
                            {TIERS.map((tier) => (
                                <th key={tier.key} className="px-3 py-3 text-center">
                                    <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-lg ${tier.bg} border ${tier.border}`}>
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${tier.color}`}>{tier.label}</span>
                                        <span className="text-white text-lg font-bold">${tier.price}<span className="text-xs text-console-muted font-normal">/mo</span></span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {FEATURE_GROUPS.map((group) => (
                            <>
                                <tr key={`group-${group.group}`} className="border-t border-console/50">
                                    <td colSpan={6} className="px-4 py-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-console-muted/60">{group.group}</span>
                                    </td>
                                </tr>
                                {group.features.map((feature) => (
                                    <tr key={feature.name} className="border-t border-console/30 hover:bg-console-surface-hover/50">
                                        <td className="px-4 py-2.5 text-console-secondary font-medium">{feature.name}</td>
                                        {TIERS.map((tier) => (
                                            <td key={tier.key} className="px-3 py-2.5 text-center">
                                                <CellValue value={feature[tier.key as keyof Feature] as boolean | string} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Competitor Analysis */}
            <div>
                <h3 className="text-xl font-bold text-console mb-1">Competitor Comparison</h3>
                <p className="text-sm text-console-muted mb-4">
                    How SpiriVerse pricing compares to alternatives in the wellness/spiritual space.
                </p>

                <div className="console-surface border border-console rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-console">
                                <th className="text-left px-4 py-3 text-console-muted font-medium">Platform</th>
                                <th className="text-left px-4 py-3 text-console-muted font-medium">Entry</th>
                                <th className="text-left px-4 py-3 text-console-muted font-medium">Mid</th>
                                <th className="text-left px-4 py-3 text-console-muted font-medium">Top</th>
                                <th className="text-left px-4 py-3 text-console-muted font-medium">Model</th>
                                <th className="text-left px-4 py-3 text-console-muted font-medium">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-console bg-console-primary/5">
                                <td className="px-4 py-3 font-semibold text-console-primary">SpiriVerse</td>
                                <td className="px-4 py-3 text-console font-medium">$9/mo</td>
                                <td className="px-4 py-3 text-console font-medium">$19-29/mo</td>
                                <td className="px-4 py-3 text-console font-medium">$39-59/mo</td>
                                <td className="px-4 py-3 text-console-secondary">Flat subscription</td>
                                <td className="px-4 py-3 text-console-secondary">No hidden fees. All features included per tier.</td>
                            </tr>
                            {COMPETITORS.map((comp) => (
                                <tr key={comp.name} className="border-t border-console/30 hover:bg-console-surface-hover/50">
                                    <td className="px-4 py-3 font-medium text-console">{comp.name}</td>
                                    <td className="px-4 py-3 text-console-secondary">{comp.entry}</td>
                                    <td className="px-4 py-3 text-console-secondary">{comp.mid}</td>
                                    <td className="px-4 py-3 text-console-secondary">{comp.top}</td>
                                    <td className="px-4 py-3 text-console-secondary">{comp.model}</td>
                                    <td className="px-4 py-3 text-console-muted text-xs">{comp.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Key Insights */}
            <div className="console-surface border border-console rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-console-primary flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm text-console-secondary">
                        <p className="font-semibold text-console">Key Positioning</p>
                        <ul className="space-y-1.5 list-disc list-inside text-console-muted">
                            <li><strong className="text-console-secondary">$9 Directory</strong> &mdash; No competitor offers a sub-$10 directory-only listing. Strong low-friction entry point.</li>
                            <li><strong className="text-console-secondary">$19 Awaken</strong> &mdash; Matches Heallist&apos;s $24 core offering at a lower price, with SpiriReadings included.</li>
                            <li><strong className="text-console-secondary">$29 Illuminate</strong> &mdash; Undercuts Vagaro ($30+add-ons) with payment links, events, tours, and live assist all included.</li>
                            <li><strong className="text-console-secondary">$39 Manifest</strong> &mdash; Full merchant capability at a fraction of Mindbody ($129+). Products, inventory, and hosting practitioners.</li>
                            <li><strong className="text-console-secondary">$59 Transcend</strong> &mdash; Complete platform with shipping, POS, refund automation, and unlimited products. Still under Square Premium ($149).</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
