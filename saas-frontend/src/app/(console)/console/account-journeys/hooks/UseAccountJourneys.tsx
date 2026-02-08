import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ConsoleAccountJourneys } from '../types';

export default function useAccountJourneys() {
    return useQuery({
        queryKey: ['console-account-journeys'],
        queryFn: async () => {
            const response = await gql<{
                consoleAccountJourneys: ConsoleAccountJourneys;
            }>(`
                query ConsoleAccountJourneys {
                    consoleAccountJourneys {
                        vendorFunnel {
                            stages {
                                stage
                                count
                                merchantCount
                                practitionerCount
                                percentOfTotal
                                medianDaysToReach
                                averageDaysToReach
                            }
                            problemStates {
                                stage
                                count
                                merchantCount
                                practitionerCount
                                percentOfTotal
                            }
                            conversions {
                                fromStage
                                toStage
                                conversionRate
                                fromCount
                                toCount
                            }
                            totalVendors
                            totalMerchants
                            totalPractitioners
                        }
                        vendorMilestones {
                            milestoneKey
                            label
                            description
                            achievedCount
                            totalEligible
                            achievedPercent
                            medianDays
                            averageDays
                            recentCount
                        }
                        customerMilestones {
                            milestoneKey
                            label
                            description
                            achievedCount
                            totalEligible
                            achievedPercent
                            medianDays
                            averageDays
                            recentCount
                        }
                        totalCustomers
                    }
                }
            `);
            return response.consoleAccountJourneys;
        },
        refetchInterval: 120000,
    });
}
