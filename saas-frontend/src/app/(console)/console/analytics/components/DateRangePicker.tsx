interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onRangeChange: (start: string, end: string) => void;
}

type Preset = { label: string; days: number };

const PRESETS: Preset[] = [
    { label: "Today", days: 0 },
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
];

function formatDateForInput(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return formatDateForInput(d);
}

export default function DateRangePicker({ startDate, endDate, onRangeChange }: DateRangePickerProps) {
    const today = formatDateForInput(new Date());

    const handlePreset = (days: number) => {
        onRangeChange(daysAgo(days), today);
    };

    return (
        <div className="flex items-center space-x-3" data-testid="date-range-picker">
            <div className="flex bg-slate-800 rounded-lg p-1 space-x-1">
                {PRESETS.map(p => {
                    const presetStart = daysAgo(p.days);
                    const isActive = startDate === presetStart && endDate === today;
                    return (
                        <button
                            key={p.label}
                            onClick={() => handlePreset(p.days)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                isActive
                                    ? "bg-console-primary text-white"
                                    : "text-console-muted hover:text-console hover:bg-slate-700"
                            }`}
                            data-testid={`date-preset-${p.label.toLowerCase()}`}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center space-x-2">
                <input
                    type="date"
                    value={startDate}
                    onChange={e => onRangeChange(e.target.value, endDate)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-console focus:border-console-primary focus:outline-none"
                    data-testid="date-start-input"
                />
                <span className="text-console-muted text-xs">to</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={e => onRangeChange(startDate, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-console focus:border-console-primary focus:outline-none"
                    data-testid="date-end-input"
                />
            </div>
        </div>
    );
}
