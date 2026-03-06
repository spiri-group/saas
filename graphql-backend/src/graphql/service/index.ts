import { DateTime, Interval } from "luxon";
import { serverContext } from "../../services/azFunction";
import { MutationResponse, recordref_type, RecordStatus } from "../0_shared/types";
import { ListingTypes } from "../listing/types";
import { PatchOperation } from "@azure/cosmos";
import { isNullOrWhiteSpace, slugify, getSpiriverseFeeConfig, getTargetFeeConfig } from "../../utils/functions";
import { v4 as uuidv4 } from 'uuid'
import { ByWeekday, RRule, rrulestr } from "rrule";
import { user_type } from "../user/types";
import { service_type, practitionerSchedule_type, serviceBooking_type } from "./types";
import { vendor_type } from "../vendor/types";
import { GraphQLError } from "graphql";
import { extractLovedOnesFromText, isMediumshipReading } from "./loved-ones-extractor";
import { renderEmailTemplate } from "../email/utils";
import { sender_details } from "../../client/email_templates";

/**
 * Validates that a requested booking time falls within the practitioner's available schedule
 * @param cosmos - Cosmos data source
 * @param merchantId - The vendor/merchant ID
 * @param serviceId - The service being booked
 * @param requestedDate - The requested booking date (ISO date string)
 * @param requestedStartTime - The requested start time (ISO time string)
 * @param requestedEndTime - The requested end time (ISO time string)
 * @returns Object with isValid boolean and reason string
 */
async function validateBookingAvailability(
    cosmos: any,
    merchantId: string,
    serviceId: string,
    requestedDate: string,
    requestedStartTime: string,
    requestedEndTime: string
): Promise<{ isValid: boolean; reason: string }> {
    // Fetch all schedules for this merchant
    const schedules = await cosmos.run_query("Main-ServicesSchedules", {
        query: "SELECT * FROM c WHERE c.merchantId=@merchantId",
        parameters: [{ name: "@merchantId", value: merchantId }]
    }, true);

    if (!schedules || schedules.length === 0) {
        return { isValid: false, reason: "No availability schedule configured for this practitioner" };
    }

    // Find schedule that includes this service
    const relevantSchedule = schedules.find((schedule: any) =>
        schedule.services?.some((svc: any) => svc.serviceRef?.id === serviceId)
    );

    if (!relevantSchedule) {
        return { isValid: false, reason: "This service is not configured in any availability schedule" };
    }

    const requestedDt = DateTime.fromISO(requestedDate);
    const requestedDay = requestedDt.weekday; // 1 = Monday, 7 = Sunday

    // Check if the requested day is enabled in weekday availability
    const weekdayConfig = relevantSchedule.weekdays?.find((wd: any) => wd.day === requestedDay);

    if (!weekdayConfig || !weekdayConfig.enabled) {
        const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return { isValid: false, reason: `Practitioner is not available on ${dayNames[requestedDay]}s` };
    }

    // Check date overrides (blocked dates or custom hours)
    const dateOverride = relevantSchedule.dateOverrides?.find((override: any) =>
        override.date === requestedDate
    );

    if (dateOverride && !dateOverride.available) {
        return { isValid: false, reason: "This date has been blocked by the practitioner" };
    }

    // Get available time slots for this day
    const availableTimes = dateOverride?.times || weekdayConfig.times || [];

    if (availableTimes.length === 0) {
        return { isValid: false, reason: "No available time slots for this day" };
    }

    // Parse requested times
    const reqStart = DateTime.fromISO(requestedStartTime);
    const reqEnd = DateTime.fromISO(requestedEndTime);

    // Check if requested time falls within any available slot
    const isWithinAvailability = availableTimes.some((slot: any) => {
        // Extract time from rrule or use direct time values
        let slotStart: DateTime;
        let slotEnd: DateTime;

        if (slot.rrule) {
            // Parse rrule to get time
            const rrule = rrulestr(slot.rrule.split("|")[0]);
            const durationMs = parseInt(slot.rrule.split("|")[1]?.split("=")[1] || "3600000");
            slotStart = DateTime.fromObject({
                hour: rrule.options.byhour?.[0] || 0,
                minute: rrule.options.byminute?.[0] || 0
            });
            slotEnd = slotStart.plus({ milliseconds: durationMs });
        } else if (slot.start && slot.end) {
            slotStart = DateTime.fromISO(slot.start);
            slotEnd = DateTime.fromISO(slot.end);
        } else {
            return false;
        }

        // Check if requested time is within this slot
        const reqStartMinutes = reqStart.hour * 60 + reqStart.minute;
        const reqEndMinutes = reqEnd.hour * 60 + reqEnd.minute;
        const slotStartMinutes = slotStart.hour * 60 + slotStart.minute;
        const slotEndMinutes = slotEnd.hour * 60 + slotEnd.minute;

        return reqStartMinutes >= slotStartMinutes && reqEndMinutes <= slotEndMinutes;
    });

    if (!isWithinAvailability) {
        return { isValid: false, reason: "Requested time is outside practitioner's available hours" };
    }

    // Check for existing bookings at this time (prevent double-booking)
    const existingBookings = await cosmos.run_query("Main-Bookings", {
        query: `SELECT * FROM c WHERE c.vendorId = @merchantId
                AND c.serviceId = @serviceId
                AND c.date = @date
                AND c.status != 'CANCELLED'`,
        parameters: [
            { name: "@merchantId", value: merchantId },
            { name: "@serviceId", value: serviceId },
            { name: "@date", value: requestedDate }
        ]
    }, true);

    // Check for time overlap with existing bookings
    for (const booking of existingBookings) {
        const bookingStart = DateTime.fromISO(booking.time?.start);
        const bookingEnd = DateTime.fromISO(booking.time?.end);

        const bookingStartMinutes = bookingStart.hour * 60 + bookingStart.minute;
        const bookingEndMinutes = bookingEnd.hour * 60 + bookingEnd.minute;
        const reqStartMinutes = reqStart.hour * 60 + reqStart.minute;
        const reqEndMinutes = reqEnd.hour * 60 + reqEnd.minute;

        // Check for overlap
        if (reqStartMinutes < bookingEndMinutes && reqEndMinutes > bookingStartMinutes) {
            return { isValid: false, reason: "This time slot is already booked" };
        }
    }

    return { isValid: true, reason: "Booking time is available" };
}

const resolvers = {
    Query: {
        service: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            // Support lookup by either id or slug
            if (args.id) {
                return await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId);
            } else if (args.slug) {
                const services = await dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.vendorId },
                        { name: "@slug", value: args.slug }
                    ]
                }, true);
                return services.length > 0 ? services[0] : null;
            }
            return null;
        },
        services: async (_: any, args: any, { dataSources }: serverContext) => {
            const services = await dataSources.cosmos.get_all<any>("Main-Listing", args.merchantId)
            const workingDays = services.find(x => x.name == "Working days")
            const remaining = services.filter(x => x.name != "Working days")
            return [workingDays, ...remaining.reverse()]
        },
        myServicesSchedule: async (_: any, args: any, context: serverContext, __: any) => {
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            const data = await context.dataSources.cosmos.run_query("Main-ServicesSchedules", {
                query: "SELECT * FROM c WHERE c.merchantId=@merchantId and c.id = @userId",
                parameters: [
                    { name: "@merchantId", value: merchantId },
                    { name: "@userId", value: context.userId}
                ]
            }, true)
        
            let schedule = data.length > 0 ? data[0] : undefined
            if (schedule == undefined) {
                // they have no schedules, so we create a default one for them
                // const {start, end, ...defaultUTC} = {
                //     start: "09:00:00.000+11:00",
                //     start_utc: DateTime.fromISO("09:00:00.000+11:00").toUTC(),
                //     end: "17:00:00.000+11:00",
                //     end_utc: DateTime.fromISO("17:00:00.000+11:00").toUTC()
                // }

                // const defaultWorkingTimeRangeRRule = {
                //     byhour: [defaultUTC.start_utc.hour],
                //     byminute: [defaultUTC.start_utc.minute]
                // }

                // const defaultWorkingTime = (day_acronym: ByWeekday) => {
                //     const diff = defaultUTC.end_utc.diff(defaultUTC.start_utc)
                //     return ({
                //         rule: new RRule({
                //             byweekday: [day_acronym],
                //             ...defaultWorkingTimeRangeRRule,
                //         }).toString() + `|MS=${diff.as('milliseconds')}`,
                //         start, end,
                //         duration_ms: diff.as("milliseconds"),
                //         serviceIds: [],
                //         deliveryMethods: {},
                //         discount: undefined
                //     })
                // }

                const record = {
                    id: context.userId,
                    merchantId: args.merchantId,
                    country: args.country,
                    timezone: args.timezone,
                    table: [{
                        weekday_configs: [{
                            weekdays: [
                                { day_acronym: 0, day: "Monday", enabled: true }, 
                                { day_acronym: 1, day: "Tuesday", enabled: true },
                                { day_acronym: 2, day: "Wednesday", enabled: true },
                                { day_acronym: 3, day: "Thursday", enabled: true },
                                { day_acronym: 4, day: "Friday", enabled: true }, 
                                { day_acronym: 5, day: "Saturday", enabled: false },
                                { day_acronym: 6, day: "Sunday", enabled: false}
                            ],
                            serviceIds: [],
                            discount: "",
                            deliveryMethods: []
                        }],
                        start: args.start,
                        end: args.end,
                        duration_ms: args.duration_ms
                    }],
                    deliveryMethods: args.deliveryMethods,
                    dateOverrides: []
                }
        
                await context.dataSources.cosmos.add_record("Main-ServicesSchedules", record, merchantId, context.userId)
        
                schedule = record
            }
        
            return schedule
        },
        servicesCalendar: async(_:any, args: any, context: serverContext, __:any) => {
            const startDt = DateTime.fromJSDate(args.start);
            const endDt = DateTime.fromJSDate(args.end);

            let schedules = await context.dataSources.cosmos.run_query("Main-ServicesSchedules", {
                query: "SELECT * FROM c WHERE c.merchantId=@merchantId",
                parameters: [{ name: "@merchantId", value: args.merchantId }]
            }, true)

            if (args.serviceIds != null) {
                const selectedServiceIds = args.serviceIds as string[]
                schedules = schedules.filter(({servicesIds} : {servicesIds: string[]}) => {
                    return servicesIds.some(id => selectedServiceIds.includes(id))
                })
            }
        
            let serviceIds_and_rules = 
                schedules.flatMap((schd) => ({
                    servicesAndSchedules: {
                        serviceIds: schd.services.map((svc_config: any) => svc_config.serviceRef.id),
                        scheduleRef: {
                            id: schd.id,
                            partition: [schd.merchantId],
                            container: "Main-ServicesSchedules"
                        }
                    },
                    rules: schd.weekdays.flatMap((weekday:any) => weekday.times).map((time: any) => time.rrule)
                }))

            const serviceIds : string[] = serviceIds_and_rules.flatMap((sr) => sr.servicesAndSchedules.serviceIds)
            const services = await context.dataSources.cosmos.run_query("Main-Listing", {
                query: "SELECT * FROM c WHERE c.vendorId=@merchantId AND ARRAY_CONTAINS( @serviceIds, c.id) ",
                parameters: [
                    { name: "@merchantId", value: args.merchantId },
                    { name: "@serviceIds", value: serviceIds }
                ]
            }, true)

            let schedules_to_rules = serviceIds_and_rules.map((sr) => ({
                schedule: {
                    services: sr.servicesAndSchedules.serviceIds.map((serviceId: string) => services.find(x => x.id == serviceId)),
                    scheduleRef: sr.servicesAndSchedules.scheduleRef
                },
                rules: sr.rules
            }))

            let rule_to_schedules = {} as any
            for(var sr of schedules_to_rules) {
                for(var r of sr.rules) {
                    if (rule_to_schedules[r] == null) rule_to_schedules[r] = sr
                    else rule_to_schedules[r] = rule_to_schedules[r].concat(sr)
                }
            }

            var all_dates: {
                date: string,
                occurences: 
                {
                    services: {
                        ref: recordref_type,
                        name: string
                    },
                    time: { 
                        start: string, 
                        end: string 
                    }
                }[]           
            }[] = Interval.fromDateTimes(startDt, endDt).splitBy({ days: 1 }).map((d) => ({
                date: d.start.toISODate(),
                occurences: []
            }))
            all_dates.push({
                date: endDt.toISODate(),
                occurences: []
            })

            var all_rules = Object.keys(rule_to_schedules)
            for (var rule of all_rules) {
                var rrule = rrulestr(rule.split("|")[0])
                var duration_ms = parseInt(rule.split("|")[1].split("=")[1])
                const start = DateTime.fromISO(`${rrule.options.byhour[0].toString().padStart(2,"0")}:${rrule.options.byminute[0].toString().padStart(2,"0")}:00.000+00:00`)
                const end = start.plus({milliseconds: duration_ms})
                
                // we need to remove the dtstart from the rrule
                rrule.options.dtstart = startDt.toJSDate()
                rrule.options.until = endDt.toJSDate()

                var dates = rrule.all();
                var tmp: any = dates.map((date) => {
                    return {
                        date: DateTime.fromJSDate(date).toISODate(),
                        occurence: {
                            schedules: 
                                rule_to_schedules[r].map((schedule:any) => ({
                                    services: schedule.services.map((service: any) => ({
                                        ref: {
                                            id: service.id,
                                            partition: [service.vendorId],
                                            container: "Main-Listing"
                                        },
                                        name: service.name
                                    })),
                                    scheduleRef: schedule.scheduleRef
                                })),
                            time: {
                                start: start.toISOTime(), end: end.toISOTime(),
                                duration_ms
                            }
                        }
                    }
                })

                for(var t of tmp) {
                    var existing_date = all_dates.find(x => x.date == t.date);
                    if (existing_date != null) {
                        existing_date.occurences.push(t.occurence)
                    } else {
                        throw "Could not find one of the dates, this should be impossible"
                    }
                }
            }                    

            return all_dates;
        },
        serviceBooking: async(_:any, args: any, {dataSources}: serverContext, __:any) => {
            const serviceBooking = await dataSources.cosmos.get_record("Main-Bookings", args.bookingId, ["SERVICE", args.userId])
            return serviceBooking
        },
        serviceBookings: async (_: any, args: { vendorId?: string, userId?: string }, { dataSources }: serverContext, ___: any) => {
            
            let parameters = []
            let whereConditions = []
            if (args.vendorId != null) {
                parameters.push({ name: "@vendorId", value: args.vendorId })
                whereConditions.push("c.vendorId = @vendorId")
            }
            if (args.userId != null) {
                parameters.push({ name: "@userId", value: args.userId })
                whereConditions.push("c.userId = @userId")
            }

            const baseQuery = "SELECT * FROM c WHERE c.type = 'SERVICE'"
            const conditionsQuery = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : ""

            const serviceBookings = await dataSources.cosmos.run_query("Main-Bookings", {
                query: `${baseQuery} ${conditionsQuery}`,
                parameters
            }, true)
        
            return serviceBookings
        },
        servicePayments: async(_:any, _args: any, context: serverContext, __:any) => {
            if (context.userId == null) throw "User must be present for this call";
            const payments = await context.dataSources.cosmos.get_all<any>("Main-Bookings", ["SERVICE", context.userId])
            return payments.map((payment) => ({...payment, type: "ServiceInvoice"}))
        },

        // NEW - Async service order queries
        // NOTE: Using "orderStatus" instead of "status" to avoid conflict with Cosmos soft-delete
        myServiceOrders: async (_: any, args: { vendorId: string, status?: string, category?: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const parameters: any[] = [
                { name: "@vendorId", value: args.vendorId }
            ];

            let whereConditions = ["c.vendorId = @vendorId"];

            // Filter by orderStatus if provided (using orderStatus field, not status)
            if (args.status) {
                parameters.push({ name: "@orderStatus", value: args.status });
                whereConditions.push("c.orderStatus = @orderStatus");
            }

            // Filter by category if provided
            if (args.category) {
                parameters.push({ name: "@category", value: args.category });
                whereConditions.push("c.service.category = @category");
            }

            const query = `SELECT * FROM c WHERE ${whereConditions.join(" AND ")} ORDER BY c.purchaseDate DESC`;

            const orders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query,
                parameters
            }, true);

            return orders || [];
        },

        // NOTE: Using "orderStatus" instead of "status" to avoid conflict with Cosmos soft-delete
        customerServiceOrders: async (_: any, args: { customerId: string, status?: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            // Verify user can only access their own orders
            if (context.userId !== args.customerId) {
                throw new Error("Unauthorized: You can only view your own service orders");
            }

            const parameters: any[] = [
                { name: "@customerId", value: args.customerId }
            ];

            let whereConditions = ["c.customerId = @customerId"];

            // Filter by orderStatus if provided (using orderStatus field, not status)
            if (args.status) {
                parameters.push({ name: "@orderStatus", value: args.status });
                whereConditions.push("c.orderStatus = @orderStatus");
            }

            const query = `SELECT * FROM c WHERE ${whereConditions.join(" AND ")} ORDER BY c.purchaseDate DESC`;

            const orders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query,
                parameters
            }, true);

            // Note: Deliverable files are stored in the public container, so they don't need signed URLs
            // The file.url is already publicly accessible

            return orders || [];
        },

        serviceOrderById: async (_: any, args: { orderId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            console.log(`[serviceOrderById] Looking up order ${args.orderId} for user ${context.userId}`);

            const orders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @orderId",
                parameters: [{ name: "@orderId", value: args.orderId }]
            }, true);

            console.log(`[serviceOrderById] Query returned ${orders?.length || 0} results`);

            if (!orders || orders.length === 0) {
                throw new Error("Service order not found");
            }

            const order = orders[0];
            console.log(`[serviceOrderById] Found order: vendorId=${order.vendorId}, customerId=${order.customerId}, userId=${context.userId}`);

            // Verify user has access:
            // 1. User is the customer who bought the service
            // 2. User owns the vendor/merchant that sold the service
            let hasAccess = order.customerId === context.userId;

            if (!hasAccess && order.vendorId) {
                // Check if user has a role on this vendor (via user.vendors array)
                const userRecords = await context.dataSources.cosmos.run_query<{
                    vendors?: { id: string, role: string }[]
                }>("Main-User", {
                    query: "SELECT c.vendors FROM c WHERE c.id = @userId",
                    parameters: [{ name: "@userId", value: context.userId }]
                });

                if (userRecords.length > 0 && userRecords[0].vendors) {
                    const userVendors = userRecords[0].vendors;
                    const hasVendorAccess = userVendors.some(v => v.id === order.vendorId);
                    if (hasVendorAccess) {
                        hasAccess = true;
                        console.log(`[serviceOrderById] Access granted: user ${context.userId} has role on vendor ${order.vendorId}`);
                    }
                }
            }

            if (!hasAccess) {
                console.log(`[serviceOrderById] Access denied: userId=${context.userId} doesn't own vendor=${order.vendorId} and isn't customer=${order.customerId}`);
                throw new Error("Unauthorized: You do not have access to this order");
            }

            // Generate signed URLs for deliverable files if they exist and user is the customer
            if (order.customerId === context.userId && order.deliverables?.files) {
                const { azureStorage } = await import("../../services/azure-storage");

                for (const file of order.deliverables.files) {
                    try {
                        file.signedUrl = await azureStorage.generateSignedUrl(file.url, 24);
                    } catch (error) {
                        console.error(`Error generating signed URL for file ${file.id}:`, error);
                    }
                }
            }

            return order;
        },

        serviceCheckoutOrder: async (_: any, args: { orderId: string }, context: serverContext) => {
            // NO AUTH REQUIRED - Public checkout link
            const orders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @orderId",
                parameters: [{ name: "@orderId", value: args.orderId }]
            }, true);

            if (!orders || orders.length === 0) {
                throw new Error("Checkout order not found");
            }

            const order = orders[0];

            // Only return if status is PENDING_PAYMENT (security check)
            if (order.status !== "PENDING_PAYMENT") {
                throw new Error("This checkout link is no longer valid");
            }

            // Check if link is expired
            if (order.checkoutLinkExpiresAt && new Date(order.checkoutLinkExpiresAt) < new Date()) {
                throw new Error("This checkout link has expired");
            }

            return order;
        },

        // ==========================================
        // Practitioner Availability & Live Booking Queries
        // ==========================================

        myPractitionerSchedule: async (_: any, args: { practitionerId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const schedules = await context.dataSources.cosmos.run_query("Main-PractitionerSchedules", {
                query: "SELECT * FROM c WHERE c.practitionerId = @practitionerId",
                parameters: [{ name: "@practitionerId", value: args.practitionerId }]
            }, true);

            if (schedules && schedules.length > 0) {
                return schedules[0];
            }

            // Return null if no schedule exists - practitioner hasn't set up availability yet
            return null;
        },

        availableSlots: async (_: any, args: {
            vendorId: string,
            serviceId: string,
            startDate: Date,
            endDate: Date,
            customerTimezone?: string,
            deliveryMethod?: string
        }, context: serverContext) => {
            const { vendorId, serviceId, startDate, endDate, customerTimezone, deliveryMethod } = args;

            // Fetch the practitioner's schedule
            const schedules = await context.dataSources.cosmos.run_query("Main-PractitionerSchedules", {
                query: "SELECT * FROM c WHERE c.practitionerId = @vendorId",
                parameters: [{ name: "@vendorId", value: vendorId }]
            }, true);

            if (!schedules || schedules.length === 0) {
                return [];
            }

            const schedule = schedules[0];

            // Fetch the service to get duration
            const service = await context.dataSources.cosmos.get_record<service_type>("Main-Listing", serviceId, vendorId);
            if (!service) {
                throw new Error("Service not found");
            }

            // Check if service uses this schedule
            if (schedule.serviceIds && !schedule.serviceIds.includes(serviceId)) {
                // If schedule has specific services, check membership
                // If serviceIds is empty, assume schedule applies to all services
                if (schedule.serviceIds.length > 0) {
                    return [];
                }
            }

            // Check delivery method availability
            if (deliveryMethod) {
                const dm = schedule.deliveryMethods;
                if (deliveryMethod === "ONLINE" && !dm?.online?.enabled) return [];
                if (deliveryMethod === "AT_PRACTITIONER" && !dm?.atPractitionerLocation?.enabled) return [];
                if (deliveryMethod === "MOBILE" && !dm?.mobile?.enabled) return [];
            }

            // Calculate service duration in minutes
            const serviceDurationMinutes = service.duration?.amount
                ? (service.duration.unit?.id === "hour" ? service.duration.amount * 60 : service.duration.amount)
                : 60;

            const bufferMinutes = schedule.bufferMinutes || 15;
            const minimumNoticeHours = schedule.minimumNoticeHours || 24;
            const practitionerTz = schedule.timezone || "America/New_York";
            const customerTz = customerTimezone || "America/New_York";

            // Fetch existing bookings in the date range
            const existingBookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: `SELECT * FROM c
                        WHERE c.vendorId = @vendorId
                        AND c.type = 'SERVICE'
                        AND c.scheduledDateTime.date >= @startDate
                        AND c.scheduledDateTime.date <= @endDate
                        AND c.confirmationStatus IN ('PENDING_CONFIRMATION', 'CONFIRMED')`,
                parameters: [
                    { name: "@vendorId", value: vendorId },
                    { name: "@startDate", value: DateTime.fromJSDate(startDate).toISODate() },
                    { name: "@endDate", value: DateTime.fromJSDate(endDate).toISODate() }
                ]
            }, true);

            // Build available days
            const availableDays: any[] = [];
            const start = DateTime.fromJSDate(startDate).setZone(practitionerTz);
            const end = DateTime.fromJSDate(endDate).setZone(practitionerTz);
            const now = DateTime.now().setZone(practitionerTz);
            const minimumBookingTime = now.plus({ hours: minimumNoticeHours });

            for (let day = start; day <= end; day = day.plus({ days: 1 })) {
                const dateStr = day.toISODate();
                const dayOfWeek = day.weekday % 7; // Convert to 0=Sunday format

                // Check for date override
                const dateOverride = schedule.dateOverrides?.find((o: any) => o.date === dateStr);

                if (dateOverride?.type === "BLOCKED") {
                    continue; // Skip blocked dates
                }

                // Get time slots for this day
                const weekdayConfig = schedule.weekdays?.find((w: any) => w.day === dayOfWeek);
                if (!weekdayConfig?.enabled && !dateOverride) {
                    continue; // Not available on this weekday
                }

                const timeSlots = dateOverride?.type === "CUSTOM"
                    ? dateOverride.timeSlots
                    : weekdayConfig?.timeSlots || [];

                if (!timeSlots || timeSlots.length === 0) {
                    continue;
                }

                const dayName = day.toFormat("EEEE");
                const availableSlots: any[] = [];

                // For each time slot, break into service-duration chunks
                for (const slot of timeSlots) {
                    const slotStart = DateTime.fromISO(`${dateStr}T${slot.start}`, { zone: practitionerTz });
                    const slotEnd = DateTime.fromISO(`${dateStr}T${slot.end}`, { zone: practitionerTz });

                    // Generate slots at buffer intervals
                    let currentSlotStart = slotStart;
                    while (currentSlotStart.plus({ minutes: serviceDurationMinutes }) <= slotEnd) {
                        const currentSlotEnd = currentSlotStart.plus({ minutes: serviceDurationMinutes });

                        // Skip if slot is before minimum notice time
                        if (currentSlotStart < minimumBookingTime) {
                            currentSlotStart = currentSlotStart.plus({ minutes: serviceDurationMinutes + bufferMinutes });
                            continue;
                        }

                        // Check for conflicts with existing bookings
                        const hasConflict = existingBookings.some((booking: any) => {
                            if (booking.scheduledDateTime?.date !== dateStr) return false;
                            const bookingStart = DateTime.fromISO(booking.scheduledDateTime.time.start, { zone: practitionerTz });
                            const bookingEnd = DateTime.fromISO(booking.scheduledDateTime.time.end, { zone: practitionerTz });
                            const bookingStartOnDay = DateTime.fromISO(`${dateStr}T${bookingStart.toFormat("HH:mm")}`, { zone: practitionerTz });
                            const bookingEndOnDay = DateTime.fromISO(`${dateStr}T${bookingEnd.toFormat("HH:mm")}`, { zone: practitionerTz });

                            // Check for overlap including buffer
                            const bookingEndWithBuffer = bookingEndOnDay.plus({ minutes: bufferMinutes });
                            return (currentSlotStart < bookingEndWithBuffer && currentSlotEnd > bookingStartOnDay);
                        });

                        if (!hasConflict) {
                            availableSlots.push({
                                start: currentSlotStart.toFormat("HH:mm"),
                                end: currentSlotEnd.toFormat("HH:mm"),
                                startUtc: currentSlotStart.toUTC().toISO(),
                                endUtc: currentSlotEnd.toUTC().toISO()
                            });
                        }

                        currentSlotStart = currentSlotStart.plus({ minutes: serviceDurationMinutes + bufferMinutes });
                    }
                }

                if (availableSlots.length > 0) {
                    availableDays.push({
                        date: dateStr,
                        dayName,
                        slots: availableSlots
                    });
                }
            }

            return availableDays;
        },

        pendingBookingConfirmations: async (_: any, args: { practitionerId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const bookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: `SELECT * FROM c
                        WHERE c.vendorId = @practitionerId
                        AND c.type = 'SERVICE'
                        AND c.confirmationStatus = 'PENDING_CONFIRMATION'
                        ORDER BY c.scheduledDateTime.utcDateTime ASC`,
                parameters: [{ name: "@practitionerId", value: args.practitionerId }]
            }, true);

            return bookings || [];
        },

        upcomingBookings: async (_: any, args: { practitionerId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const now = DateTime.now().toUTC().toISO();

            const bookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: `SELECT * FROM c
                        WHERE c.vendorId = @practitionerId
                        AND c.type = 'SERVICE'
                        AND c.confirmationStatus = 'CONFIRMED'
                        AND c.scheduledDateTime.utcDateTime > @now
                        ORDER BY c.scheduledDateTime.utcDateTime ASC`,
                parameters: [
                    { name: "@practitionerId", value: args.practitionerId },
                    { name: "@now", value: now }
                ]
            }, true);

            return bookings || [];
        },

        scheduledBooking: async (_: any, args: { customerId: string, bookingId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            if (context.userId !== args.customerId) {
                throw new Error("Unauthorized: You can only view your own bookings");
            }

            const bookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @bookingId AND c.customerId = @customerId",
                parameters: [
                    { name: "@bookingId", value: args.bookingId },
                    { name: "@customerId", value: args.customerId }
                ]
            }, true);

            return bookings && bookings.length > 0 ? bookings[0] : null;
        },

        myScheduledBookings: async (_: any, args: { customerId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            if (context.userId !== args.customerId) {
                throw new Error("Unauthorized: You can only view your own bookings");
            }

            // Fetch all scheduled service bookings for this customer
            const bookings = await context.dataSources.cosmos.run_query<serviceBooking_type>("Main-Bookings", {
                query: `SELECT * FROM c
                        WHERE c.customerId = @customerId
                        AND c.type = 'SERVICE'
                        AND IS_DEFINED(c.scheduledDateTime)
                        ORDER BY c.scheduledDateTime.date DESC`,
                parameters: [
                    { name: "@customerId", value: args.customerId }
                ]
            }, true);

            return bookings || [];
        }
    },
    Mutation: {
        create_service: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            var item = args.service;
            item["type"] = ListingTypes.SERVICE;
            item["vendorId"] = args.merchantId;
            item.name = item.name

            // Assign tax code for services
            // txcd_10000000 General - Electronically Supplied Services
            // https://docs.stripe.com/tax/tax-codes
            item.stripe = {
                tax_code: "txcd_10000000"
            }

            // if (item.availableUntil.type == "within") {
            //     item.availableUntil.range.from = DateTime.fromJSDate(item.availableUntil.range.from).toISODate()
            //     item.availableUntil.range.to = DateTime.fromJSDate(item.availableUntil.range.to).toISODate()
            // }

            await context.dataSources.cosmos.add_record("Main-Listing", item, item["vendorId"], context.userId)

            return {
                code: 200,
                message: `Service ${item['name']} has been setup successfully`,
                service: await context.dataSources.cosmos.get_record("Main-Listing", item.id, item["vendorId"])
            }
        },
        create_service_schedule: async(_: any, args:any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            if (isNullOrWhiteSpace(args.name)) {
                throw `You can't create a schedule without it having a name, please provide one.`
            }
            
            const {start, end, ...defaultUTC} = {
                start: "09:00:00.000+11:00",
                start_utc: DateTime.fromISO("09:00:00.000+11:00").toUTC(),
                end: "17:00:00.000+11:00",
                end_utc: DateTime.fromISO("17:00:00.000+11:00").toUTC()
            }

            const defaultWorkingTimeRangeRRule = {
                byhour: [defaultUTC.start_utc.hour],
                byminute: [defaultUTC.start_utc.minute]
            }   

            const defaultWorkingTime = (day_acronym: ByWeekday) => {
                const diff = defaultUTC.end_utc.diff(defaultUTC.start_utc)
                return ({
                    rule: new RRule({
                        byweekday: [day_acronym],
                        ...defaultWorkingTimeRangeRRule,
                    }).toString() + `|MS=${diff.as('milliseconds')}`,
                    start, end,
                    duration_ms: diff.as("milliseconds")
                })
            }

            const record = {
                id: uuidv4(),
                name: args.name,
                merchantId: args.merchantId,
                dateOverrides: [],
                weekdays: [
                    { day_acronym: 0, day: "Monday", enabled: true, times: [defaultWorkingTime(0)] }, 
                    { day_acronym: 1, day: "Tuesday", enabled: true, times: [defaultWorkingTime(1)] },
                    { day_acronym: 2, day: "Wednesday", enabled: true, times: [defaultWorkingTime(2)] },
                    { day_acronym: 3, day: "Thursday", enabled: true, times: [defaultWorkingTime(3)] },
                    { day_acronym: 4, day: "Friday", enabled: true, times:  [defaultWorkingTime(4)]  }, 
                    { day_acronym: 5, day: "Saturday", enabled: false, times: [] },
                    { day_acronym: 6, day: "Sunday", enabled: false, times: [] }
                ]
            }

            await context.dataSources.cosmos.add_record("Main-ServicesSchedules", record, args.merchantId, context.userId)

            return {
                code: "200",
                message: `Schedule ${record.id} successfully created`,
                data: await context.dataSources.cosmos.get_record("Main-ServicesSchedules", record.id, args.merchantId )
            }
        },
        schedule_availability: async (_: any, args: any, context: serverContext) : Promise<MutationResponse> => {
            if (context.userId == null) throw "User must be present for this call";

            //FIX: If the id matches an existing record need to update
            //FIX: If the schedule name given does not match the id throw an error
            
            const container = await context.dataSources.cosmos.get_container("Main-ServicesSchedules")

            const ops : PatchOperation[] = []

            ops.push({
                op: "set",
                value: args.schedule.country,
                path: "/country"
            })
            ops.push({
                op: "set",
                value: args.schedule.timezone,
                path: "/timezone"
            })

            ops.push({
                op: "set",
                value: args.schedule.deliveryMethods,
                path: "/deliveryMethods"
            })

            // ops.push({ 
            //     op: "set", 
            //     value: args.schedule.table.map(({}) => {
            //         return {
            //             table: [{
            //                 weekday_configs: [{
            //                     weekdays: [
            //                         { day_acronym: 0, day: "Monday" }, 
            //                         { day_acronym: 1, day: "Tuesday" },
            //                         { day_acronym: 2, day: "Wednesday" },
            //                         { day_acronym: 3, day: "Thursday" },
            //                         { day_acronym: 4, day: "Friday" }, 
            //                         { day_acronym: 5, day: "Saturday" },
            //                         { day_acronym: 6, day: "Sunday" }
            //                     ],
            //                     serviceIds: [],
            //                     discount: "",
            //                     deliveryMethods: []
            //                 }],
            //                 start: args.start,
            //                 end: args.end,
            //                 duration_ms: args.duration_ms
            //             }]
            //         }
            //     }),
            //     path: "/table"
            // })

            // ops.push({
            //     op: "set",
            //     value: args.schedule.weekdays.map(({ times, ...weekday } : any) => {
            //         return {
            //             ...weekday,
            //             times: times.map(({time: {start, end}, ...timeSlot} : any) => {
            //                 const startTime = DateTime.fromJSDate(start);
            //                 const endTime = DateTime.fromJSDate(end);
            //                 const diff = endTime.toUTC().diff(startTime.toUTC());
            //                 return {
            //                     ...timeSlot,
            //                     rrule: new RRule({
            //                         byweekday: [weekday.day_acronym],
            //                         byhour: [startTime.toUTC().hour],
            //                         byminute: [startTime.toUTC().minute]
            //                     }).toString() + `|MS=${diff.as('milliseconds')}`,
            //                     start: startTime.toISOTime(),
            //                     end: endTime.toISOTime(),
            //                     duration_ms: diff.as("milliseconds")
            //                 }
            //             })
            //         }
            //     }),
            //     path: "/weekdays"
            // })
            
            await container.item(args.scheduleId, args.merchantId).patch(ops);

            return {
                code: "200",
                success: true,
                message: `Schedule ${args.scheduleId} successfully updated`
            }
        },
        book_service: async (_: any, args: any, context: serverContext): Promise<any> => {
            if (context.userId == null) throw "User must be present for this call";

            // Fetch the service to get actual pricing
            const service = await context.dataSources.cosmos.get_record<service_type>("Main-Listing", args.serviceId, args.merchantId);
            if (!service) throw new Error("Service not found");

            var {date, time, practitionerTimezone, customerTimezone, ...bookService} = args.bookService

            // Validate booking against practitioner availability (for SYNC services)
            if (service.deliveryMode === "SYNC" && date && time) {
                const requestedDate = DateTime.fromJSDate(date).toISODate();
                const requestedStartTime = DateTime.fromJSDate(time.start).toISOTime();
                const requestedEndTime = DateTime.fromJSDate(time.end).toISOTime();

                const availabilityCheck = await validateBookingAvailability(
                    context.dataSources.cosmos,
                    args.merchantId,
                    args.serviceId,
                    requestedDate,
                    requestedStartTime,
                    requestedEndTime
                );

                if (!availabilityCheck.isValid) {
                    throw new GraphQLError(availabilityCheck.reason, {
                        extensions: { code: 'BOOKING_UNAVAILABLE' }
                    });
                }
            }

            // Calculate price based on service pricing type
            let amount = 0;
            let currency = "USD";

            if (service.pricing?.type === "HOURLY" && service.pricing.ratePerHour) {
                amount = service.pricing.ratePerHour.amount;
                currency = service.pricing.ratePerHour.currency;
            } else if (service.pricing?.type === "FIXED" && service.pricing.fixedPrice) {
                amount = service.pricing.fixedPrice.amount;
                currency = service.pricing.fixedPrice.currency;
            } else if (service.pricing?.type === "PACKAGE" && service.pricing.packageOptions && service.pricing.packageOptions.length > 0) {
                amount = service.pricing.packageOptions[0].price.amount;
                currency = service.pricing.packageOptions[0].price.currency;
            } else {
                throw new Error("Service pricing not configured correctly");
            }

            // Store timezone-aware booking information
            var record = {
                id: uuidv4(),
                type: "SERVICE",
                vendorId: args.merchantId,
                serviceId: args.serviceId,
                userId: context.userId,
                date: DateTime.fromJSDate(date).toISODate(),
                time: {
                    start: DateTime.fromJSDate(time.start).toISOTime(),
                    end: DateTime.fromJSDate(time.end).toISOTime(),
                    duration_ms: time.duration_ms
                },
                // NEW: Store timezone metadata
                scheduledDateTime: {
                    date: DateTime.fromJSDate(date).toISODate(),
                    time: {
                        start: DateTime.fromJSDate(time.start).toISOTime(),
                        end: DateTime.fromJSDate(time.end).toISOTime(),
                        duration_ms: time.duration_ms
                    },
                    practitionerTimezone: practitionerTimezone || "UTC",
                    customerTimezone: customerTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                    // Convert to UTC for absolute reference
                    utcDateTime: DateTime.fromJSDate(date).setZone(practitionerTimezone || "UTC").toUTC().toISO()
                },
                ...bookService
            }
            const partition = ["SERVICE", context.userId]
            await context.dataSources.cosmos.add_record("Main-Bookings", record, partition, context.userId)

            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", context.userId, context.userId)
            const invoiceResp = await context.dataSources.stripe.callApi("POST", "invoices", {
                customer: user.stripe.customerId,
                metadata: {
                    target: "Main-Bookings",
                    bookingId: record.id,
                    userId: user.id
                }
            });

            if (invoiceResp.status != 200) throw 'Error in creating checkout in stripe'

            const stripe = {
                invoiceId: invoiceResp.data["id"],
                invoiceNumber: invoiceResp.data["number"],
                invoiceStatus: invoiceResp.data["status"]
            } as any;

            await context.dataSources.stripe.callApi("POST", "invoiceitems", {
                customer: user.stripe.customerId,
                invoice: invoiceResp.data["id"],
                description: service.name || "Service Booking",
                amount: amount * 100, // Convert to cents
                currency: currency.toLowerCase()
            });

            const finalizeInvoice = await context.dataSources.stripe.callApi("POST", `invoices/${invoiceResp.data["id"]}/finalize`, {
                auto_advance: false
            })
            stripe.paymentIntentId = finalizeInvoice.data["payment_intent"];
            stripe.invoiceNumber = finalizeInvoice.data["number"];
            stripe.invoiceStatus = finalizeInvoice.data["status"];
            stripe.amountDue = finalizeInvoice.data["amount_due"];
            stripe.amountCharged = 0
            stripe.amountRefunded = 0
            
            const paymentIntent = await context.dataSources.stripe.callApi("GET", `payment_intents/${stripe.paymentIntentId}`)
            stripe.paymentIntentSecret = paymentIntent.data["client_secret"]
            
            await context.dataSources.stripe.callApi("POST", `payment_intents/${stripe.paymentIntentId}`, {
                metadata: {
                    target: "Main-Bookings",
                    bookingId: record.id,
                    userId: user.id
                }
            })

            await context.dataSources.cosmos.patch_record("Main-Bookings", record.id, partition,
                [
                    { op: "set", path: `/stripe`,
                      value: stripe
                    }
                ], context.userId)

            return {
                code: "200",
                success: true,
                message: `Service ${args.id} successfully booked`,
                bookService: await context.dataSources.cosmos.get_record("Main-Bookings", record.id, partition)
            }
        },
        cancel_booking: async (_: any, args: { chargeId: string, amountToRefund: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await context.dataSources.stripe.callApi("POST", `refunds`, {
                charge: args.chargeId,
                amount: parseFloat(args.amountToRefund)
            })

            const chargeResponse = await context.dataSources.stripe.callApi("GET", `charges/${args.chargeId}`);
            
            return {
                code: "200",
                success: true,
                message: `Booking canceled, charge succesfully refunded`,
                charge: {
                    ...chargeResponse.data,
                    //TODO: Needs to take acccount aplication fee in future
                    amount_remaining: chargeResponse.data["amount_captured"] - chargeResponse.data["amount_refunded"]
                }
            }
        },
        update_service_booking: async (_: any, args: { input: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { bookingId, customerId, action, newDate, newTime, reason } = args.input;

            // Fetch the booking
            const booking = await context.dataSources.cosmos.get_record<any>("Main-Bookings", bookingId, customerId);
            if (!booking) {
                throw new GraphQLError(`Booking ${bookingId} not found`);
            }

            // Verify the user owns this booking
            if (booking.customerId !== customerId || booking.customerId !== context.userId) {
                throw new GraphQLError("You do not have permission to modify this booking");
            }

            if (action === "CANCEL") {
                // Import policy utils
                const { fetchCancellationPolicy, calculateRefund } = require('./cancellation_policy_utils');

                // Fetch cancellation policy
                const policy = await fetchCancellationPolicy(
                    context.dataSources.cosmos,
                    booking.service.id,
                    booking.vendorId
                );

                if (!policy) {
                    throw new GraphQLError("No cancellation policy found for this service");
                }

                // Calculate refund
                const appointmentDateTime = booking.scheduledDateTime?.utcDateTime || booking.date;
                const paidAmount = booking.stripe?.totalPaid?.amount || 0;

                const refundCalc = calculateRefund(policy, appointmentDateTime, paidAmount);

                if (refundCalc.refundAmount > 0) {
                    // Process refund via Stripe
                    const chargeId = booking.stripe?.charge?.id;
                    if (chargeId) {
                        await context.dataSources.stripe.callApi("POST", `refunds`, {
                            charge: chargeId,
                            amount: Math.round(refundCalc.refundAmount * 100) // Convert to cents
                        });
                    }
                }

                // Update booking status
                await context.dataSources.cosmos.patch_record(
                    "Main-Bookings",
                    bookingId,
                    customerId,
                    [
                        { op: "replace", path: "/status", value: "CANCELLED" },
                        { op: "add", path: "/cancelledAt", value: DateTime.now().toISO() },
                        { op: "add", path: "/cancelReason", value: reason || refundCalc.reason }
                    ],
                    context.userId
                );

                const updatedBooking = await context.dataSources.cosmos.get_record("Main-Bookings", bookingId, customerId);

                return {
                    code: "200",
                    success: true,
                    message: `Booking cancelled. ${refundCalc.reason}`,
                    booking: updatedBooking,
                    refundAmount: refundCalc.refundAmount,
                    refundPercentage: refundCalc.refundPercentage
                };
            }

            throw new GraphQLError(`Unknown action: ${action}`);
        },
        request_reschedule: async (_: any, args: { input: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { bookingId, customerId, newDate, newTime } = args.input;

            // Fetch the booking
            const booking = await context.dataSources.cosmos.get_record<any>("Main-Bookings", bookingId, customerId);
            if (!booking) {
                throw new GraphQLError(`Booking ${bookingId} not found`);
            }

            // Verify the user owns this booking
            if (booking.customerId !== customerId || booking.customerId !== context.userId) {
                throw new GraphQLError("You do not have permission to modify this booking");
            }

            // Import policy utils
            const { fetchCancellationPolicy, checkRescheduleEligibility } = require('./cancellation_policy_utils');

            // Fetch cancellation policy
            const policy = await fetchCancellationPolicy(
                context.dataSources.cosmos,
                booking.service.id,
                booking.vendorId
            );

            if (!policy) {
                throw new GraphQLError("No cancellation policy found for this service");
            }

            // Check eligibility
            const appointmentDateTime = booking.scheduledDateTime?.utcDateTime || booking.date;
            const currentRescheduleCount = booking.rescheduleCount || 0;

            const eligibility = checkRescheduleEligibility(policy, appointmentDateTime, currentRescheduleCount);

            if (!eligibility.eligible) {
                throw new GraphQLError(eligibility.reason);
            }

            // Update booking with new date/time
            await context.dataSources.cosmos.patch_record(
                "Main-Bookings",
                bookingId,
                customerId,
                [
                    { op: "replace", path: "/date", value: newDate },
                    { op: "replace", path: "/time", value: newTime },
                    { op: "replace", path: "/rescheduleCount", value: currentRescheduleCount + 1 },
                    { op: "add", path: "/lastRescheduledAt", value: DateTime.now().toISO() }
                ],
                context.userId
            );

            const updatedBooking = await context.dataSources.cosmos.get_record("Main-Bookings", bookingId, customerId);

            return {
                code: "200",
                success: true,
                message: `Booking rescheduled successfully. ${eligibility.maxReschedules - eligibility.rescheduleCount - 1} reschedules remaining.`,
                booking: updatedBooking,
                rescheduleCount: currentRescheduleCount + 1,
                maxReschedules: eligibility.maxReschedules
            };
        },

        // NEW - Async service creation mutations
        create_reading_offer: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const serviceId = args.input.id || uuidv4();

            // Calculate price for SKU display
            let basePrice = 0;
            let currency = "USD";
            if (args.input.pricing.type === "FIXED") {
                basePrice = args.input.pricing.fixedPrice.amount;
                currency = args.input.pricing.fixedPrice.currency;
            } else if (args.input.pricing.type === "PACKAGE" && args.input.pricing.packages && args.input.pricing.packages.length > 0) {
                basePrice = args.input.pricing.packages[0].price.amount;
                currency = args.input.pricing.packages[0].price.currency;
            } else if (args.input.pricing.type === "HOURLY") {
                basePrice = args.input.pricing.hourlyRate.amount;
                currency = args.input.pricing.hourlyRate.currency;
            }

            const bookingType = args.input.bookingType || (args.input.requiresConsultation ? "SCHEDULED" : "ASAP");
            const deliveryMode = args.input.requiresConsultation ? "SYNC" : "ASYNC";

            // Generate unique slug for the service
            let baseSlug = slugify(args.input.name);
            let finalSlug = baseSlug;
            let counter = 1;

            while (true) {
                const existingSlugs = await context.dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT VALUE c.slug FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.merchantId },
                        { name: "@slug", value: finalSlug }
                    ]
                }, true);

                if (existingSlugs.length === 0) {
                    break;
                }
                counter++;
                finalSlug = `${baseSlug}-${counter}`;
            }

            const item = {
                id: serviceId,
                slug: finalSlug,
                type: ListingTypes.SERVICE,
                vendorId: args.merchantId,
                name: args.input.name,
                description: args.input.description,
                terms: args.input.terms || "",
                faq: args.input.faq || [],
                thumbnail: args.input.thumbnail,
                ref: {
                    id: serviceId,
                    partition: [args.merchantId],
                    container: "Main-Listing"
                },
                // Tax code for services (Electronically Supplied Services)
                stripe: {
                    tax_code: "txcd_10000000"
                },
                // Catalogue fields
                status: RecordStatus.ACTIVE,
                displayScore: Math.random(),
                skus: [{
                    id: `${serviceId}-sku`,
                    price: {
                        amount: basePrice,
                        currency: currency
                    },
                    qty: "999"
                }],
                // Service fields
                category: "READING",
                deliveryMode: deliveryMode,
                bookingType: bookingType,
                pricing: args.input.pricing,
                turnaroundDays: args.input.turnaroundDays,
                deliveryFormats: (args.input.deliveryFormats || []).map((f: string) => ({ format: f })),
                addOns: args.input.addOns || [],
                questionnaire: args.input.questionnaire || [],
                targetTimezones: args.input.targetTimezones || [],
                readingOptions: args.input.readingOptions,
                ...(args.input.scheduleId && { scheduleId: args.input.scheduleId })
            };

            await context.dataSources.cosmos.add_record("Main-Listing", item, item.vendorId, context.userId);

            return await context.dataSources.cosmos.get_record("Main-Listing", item.id, item.vendorId);
        },

        create_healing_offer: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const serviceId = args.input.id || uuidv4();

            // Calculate price for SKU display
            let basePrice = 0;
            let currency = "USD";
            if (args.input.pricing.type === "FIXED") {
                basePrice = args.input.pricing.fixedPrice.amount;
                currency = args.input.pricing.fixedPrice.currency;
            } else if (args.input.pricing.type === "PACKAGE" && args.input.pricing.packages && args.input.pricing.packages.length > 0) {
                basePrice = args.input.pricing.packages[0].price.amount;
                currency = args.input.pricing.packages[0].price.currency;
            } else if (args.input.pricing.type === "HOURLY") {
                basePrice = args.input.pricing.hourlyRate.amount;
                currency = args.input.pricing.hourlyRate.currency;
            }

            const bookingType = args.input.bookingType || (args.input.requiresConsultation ? "SCHEDULED" : "ASAP");
            const deliveryMode = args.input.requiresConsultation ? "SYNC" : "ASYNC";

            // Generate unique slug for the service
            let baseSlug = slugify(args.input.name);
            let finalSlug = baseSlug;
            let counter = 1;

            while (true) {
                const existingSlugs = await context.dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT VALUE c.slug FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.merchantId },
                        { name: "@slug", value: finalSlug }
                    ]
                }, true);

                if (existingSlugs.length === 0) {
                    break;
                }
                counter++;
                finalSlug = `${baseSlug}-${counter}`;
            }

            const item = {
                id: serviceId,
                slug: finalSlug,
                type: ListingTypes.SERVICE,
                vendorId: args.merchantId,
                name: args.input.name,
                description: args.input.description,
                terms: args.input.terms || "",
                faq: args.input.faq || [],
                thumbnail: args.input.thumbnail,
                ref: {
                    id: serviceId,
                    partition: [args.merchantId],
                    container: "Main-Listing"
                },
                // Tax code for services (Electronically Supplied Services)
                stripe: {
                    tax_code: "txcd_10000000"
                },
                // Catalogue fields
                status: RecordStatus.ACTIVE,
                displayScore: Math.random(),
                skus: [{
                    id: `${serviceId}-sku`,
                    price: {
                        amount: basePrice,
                        currency: currency
                    },
                    qty: "999"
                }],
                // Service fields
                category: "HEALING",
                deliveryMode: deliveryMode,
                bookingType: bookingType,
                pricing: args.input.pricing,
                turnaroundDays: args.input.turnaroundDays,
                addOns: args.input.addOns || [],
                questionnaire: args.input.questionnaire || [],
                targetTimezones: args.input.targetTimezones || [],
                healingOptions: args.input.healingOptions,
                ...(args.input.scheduleId && { scheduleId: args.input.scheduleId })
            };

            await context.dataSources.cosmos.add_record("Main-Listing", item, item.vendorId, context.userId);

            return await context.dataSources.cosmos.get_record("Main-Listing", item.id, item.vendorId);
        },

        create_coaching_offer: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const serviceId = args.input.id || uuidv4();

            // Calculate price for SKU display
            let basePrice = 0;
            let currency = "USD";
            if (args.input.pricing.type === "FIXED") {
                basePrice = args.input.pricing.fixedPrice.amount;
                currency = args.input.pricing.fixedPrice.currency;
            } else if (args.input.pricing.type === "PACKAGE" && args.input.pricing.packages && args.input.pricing.packages.length > 0) {
                basePrice = args.input.pricing.packages[0].price.amount;
                currency = args.input.pricing.packages[0].price.currency;
            } else if (args.input.pricing.type === "HOURLY") {
                basePrice = args.input.pricing.hourlyRate.amount;
                currency = args.input.pricing.hourlyRate.currency;
            }

            const bookingType = args.input.bookingType || (args.input.requiresConsultation ? "SCHEDULED" : "ASAP");
            const deliveryMode = args.input.requiresConsultation ? "SYNC" : "ASYNC";

            // Generate unique slug for the service
            let baseSlug = slugify(args.input.name);
            let finalSlug = baseSlug;
            let counter = 1;

            while (true) {
                const existingSlugs = await context.dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT VALUE c.slug FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.merchantId },
                        { name: "@slug", value: finalSlug }
                    ]
                }, true);

                if (existingSlugs.length === 0) {
                    break;
                }
                counter++;
                finalSlug = `${baseSlug}-${counter}`;
            }

            const item = {
                id: serviceId,
                slug: finalSlug,
                type: ListingTypes.SERVICE,
                vendorId: args.merchantId,
                name: args.input.name,
                description: args.input.description,
                terms: args.input.terms || "",
                faq: args.input.faq || [],
                thumbnail: args.input.thumbnail,
                ref: {
                    id: serviceId,
                    partition: [args.merchantId],
                    container: "Main-Listing"
                },
                // Tax code for services (Electronically Supplied Services)
                stripe: {
                    tax_code: "txcd_10000000"
                },
                // Catalogue fields
                status: RecordStatus.ACTIVE,
                displayScore: Math.random(),
                skus: [{
                    id: `${serviceId}-sku`,
                    price: {
                        amount: basePrice,
                        currency: currency
                    },
                    qty: "999"
                }],
                // Service fields
                category: "COACHING",
                deliveryMode: deliveryMode,
                bookingType: bookingType,
                pricing: args.input.pricing,
                deliveryFormats: (args.input.deliveryFormats || []).map((f: string) => ({ format: f })),
                turnaroundDays: args.input.turnaroundDays,
                addOns: args.input.addOns || [],
                questionnaire: args.input.questionnaire || [],
                targetTimezones: args.input.targetTimezones || [],
                coachingOptions: args.input.coachingOptions,
                ...(args.input.scheduleId && { scheduleId: args.input.scheduleId })
            };

            await context.dataSources.cosmos.add_record("Main-Listing", item, item.vendorId, context.userId);

            return await context.dataSources.cosmos.get_record("Main-Listing", item.id, item.vendorId);
        },

        // UPDATE - Async service update mutations
        update_reading_offer: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            // Fetch existing service
            const existing = await context.dataSources.cosmos.get_record<any>("Main-Listing", args.input.id, args.merchantId);
            if (!existing) throw new Error("Service not found");

            // Calculate price for SKU if pricing changed
            let basePrice = existing.skus?.[0]?.price?.amount || 0;
            let currency = existing.skus?.[0]?.price?.currency || "USD";

            if (args.input.pricing) {
                if (args.input.pricing.type === "FIXED") {
                    basePrice = args.input.pricing.fixedPrice.amount;
                    currency = args.input.pricing.fixedPrice.currency;
                } else if (args.input.pricing.type === "PACKAGE" && args.input.pricing.packages && args.input.pricing.packages.length > 0) {
                    basePrice = args.input.pricing.packages[0].price.amount;
                    currency = args.input.pricing.packages[0].price.currency;
                } else if (args.input.pricing.type === "HOURLY") {
                    basePrice = args.input.pricing.hourlyRate.amount;
                    currency = args.input.pricing.hourlyRate.currency;
                }
            }

            // Build patch operations for updated fields
            const container = await context.dataSources.cosmos.get_container("Main-Listing");
            const ops: PatchOperation[] = [];

            if (args.input.name !== undefined) ops.push({ op: "set", path: "/name", value: args.input.name });
            if (args.input.description !== undefined) ops.push({ op: "set", path: "/description", value: args.input.description });
            if (args.input.terms !== undefined) ops.push({ op: "set", path: "/terms", value: args.input.terms });
            if (args.input.faq !== undefined) ops.push({ op: "set", path: "/faq", value: args.input.faq });
            if (args.input.thumbnail !== undefined) ops.push({ op: "set", path: "/thumbnail", value: args.input.thumbnail });
            if (args.input.pricing !== undefined) {
                ops.push({ op: "set", path: "/pricing", value: args.input.pricing });
                ops.push({ op: "set", path: "/skus/0/price", value: { amount: basePrice, currency: currency } });
            }
            if (args.input.turnaroundDays !== undefined) ops.push({ op: "set", path: "/turnaroundDays", value: args.input.turnaroundDays });
            if (args.input.deliveryFormats !== undefined) ops.push({ op: "set", path: "/deliveryFormats", value: args.input.deliveryFormats.map((f: string) => ({ format: f })) });
            if (args.input.addOns !== undefined) ops.push({ op: "set", path: "/addOns", value: args.input.addOns });
            if (args.input.questionnaire !== undefined) ops.push({ op: "set", path: "/questionnaire", value: args.input.questionnaire });
            if (args.input.targetTimezones !== undefined) ops.push({ op: "set", path: "/targetTimezones", value: args.input.targetTimezones });
            if (args.input.readingOptions !== undefined) ops.push({ op: "set", path: "/readingOptions", value: args.input.readingOptions });
            if (args.input.requiresConsultation !== undefined) {
                const deliveryMode = args.input.requiresConsultation ? "SYNC" : "ASYNC";
                ops.push({ op: "set", path: "/deliveryMode", value: deliveryMode });
            }
            if (args.input.bookingType !== undefined) ops.push({ op: "set", path: "/bookingType", value: args.input.bookingType });
            if (args.input.scheduleId !== undefined) ops.push({ op: "set", path: "/scheduleId", value: args.input.scheduleId });

            if (ops.length > 0) {
                await container.item(args.input.id, args.merchantId).patch(ops);
            }

            return await context.dataSources.cosmos.get_record("Main-Listing", args.input.id, args.merchantId);
        },

        update_healing_offer: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            // Fetch existing service
            const existing = await context.dataSources.cosmos.get_record<any>("Main-Listing", args.input.id, args.merchantId);
            if (!existing) throw new Error("Service not found");

            // Calculate price for SKU if pricing changed
            let basePrice = existing.skus?.[0]?.price?.amount || 0;
            let currency = existing.skus?.[0]?.price?.currency || "USD";

            if (args.input.pricing) {
                if (args.input.pricing.type === "FIXED") {
                    basePrice = args.input.pricing.fixedPrice.amount;
                    currency = args.input.pricing.fixedPrice.currency;
                } else if (args.input.pricing.type === "PACKAGE" && args.input.pricing.packages && args.input.pricing.packages.length > 0) {
                    basePrice = args.input.pricing.packages[0].price.amount;
                    currency = args.input.pricing.packages[0].price.currency;
                } else if (args.input.pricing.type === "HOURLY") {
                    basePrice = args.input.pricing.hourlyRate.amount;
                    currency = args.input.pricing.hourlyRate.currency;
                }
            }

            // Build patch operations for updated fields
            const container = await context.dataSources.cosmos.get_container("Main-Listing");
            const ops: PatchOperation[] = [];

            if (args.input.name !== undefined) ops.push({ op: "set", path: "/name", value: args.input.name });
            if (args.input.description !== undefined) ops.push({ op: "set", path: "/description", value: args.input.description });
            if (args.input.terms !== undefined) ops.push({ op: "set", path: "/terms", value: args.input.terms });
            if (args.input.faq !== undefined) ops.push({ op: "set", path: "/faq", value: args.input.faq });
            if (args.input.thumbnail !== undefined) ops.push({ op: "set", path: "/thumbnail", value: args.input.thumbnail });
            if (args.input.pricing !== undefined) {
                ops.push({ op: "set", path: "/pricing", value: args.input.pricing });
                ops.push({ op: "set", path: "/skus/0/price", value: { amount: basePrice, currency: currency } });
            }
            if (args.input.turnaroundDays !== undefined) ops.push({ op: "set", path: "/turnaroundDays", value: args.input.turnaroundDays });
            if (args.input.addOns !== undefined) ops.push({ op: "set", path: "/addOns", value: args.input.addOns });
            if (args.input.questionnaire !== undefined) ops.push({ op: "set", path: "/questionnaire", value: args.input.questionnaire });
            if (args.input.targetTimezones !== undefined) ops.push({ op: "set", path: "/targetTimezones", value: args.input.targetTimezones });
            if (args.input.healingOptions !== undefined) ops.push({ op: "set", path: "/healingOptions", value: args.input.healingOptions });
            if (args.input.requiresConsultation !== undefined) {
                const deliveryMode = args.input.requiresConsultation ? "SYNC" : "ASYNC";
                ops.push({ op: "set", path: "/deliveryMode", value: deliveryMode });
            }
            if (args.input.bookingType !== undefined) ops.push({ op: "set", path: "/bookingType", value: args.input.bookingType });
            if (args.input.scheduleId !== undefined) ops.push({ op: "set", path: "/scheduleId", value: args.input.scheduleId });

            if (ops.length > 0) {
                await container.item(args.input.id, args.merchantId).patch(ops);
            }

            return await context.dataSources.cosmos.get_record("Main-Listing", args.input.id, args.merchantId);
        },

        update_coaching_offer: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            // Fetch existing service
            const existing = await context.dataSources.cosmos.get_record<any>("Main-Listing", args.input.id, args.merchantId);
            if (!existing) throw new Error("Service not found");

            // Calculate price for SKU if pricing changed
            let basePrice = existing.skus?.[0]?.price?.amount || 0;
            let currency = existing.skus?.[0]?.price?.currency || "USD";

            if (args.input.pricing) {
                if (args.input.pricing.type === "FIXED") {
                    basePrice = args.input.pricing.fixedPrice.amount;
                    currency = args.input.pricing.fixedPrice.currency;
                } else if (args.input.pricing.type === "PACKAGE" && args.input.pricing.packages && args.input.pricing.packages.length > 0) {
                    basePrice = args.input.pricing.packages[0].price.amount;
                    currency = args.input.pricing.packages[0].price.currency;
                } else if (args.input.pricing.type === "HOURLY") {
                    basePrice = args.input.pricing.hourlyRate.amount;
                    currency = args.input.pricing.hourlyRate.currency;
                }
            }

            // Build patch operations for updated fields
            const container = await context.dataSources.cosmos.get_container("Main-Listing");
            const ops: PatchOperation[] = [];

            if (args.input.name !== undefined) ops.push({ op: "set", path: "/name", value: args.input.name });
            if (args.input.description !== undefined) ops.push({ op: "set", path: "/description", value: args.input.description });
            if (args.input.terms !== undefined) ops.push({ op: "set", path: "/terms", value: args.input.terms });
            if (args.input.faq !== undefined) ops.push({ op: "set", path: "/faq", value: args.input.faq });
            if (args.input.thumbnail !== undefined) ops.push({ op: "set", path: "/thumbnail", value: args.input.thumbnail });
            if (args.input.pricing !== undefined) {
                ops.push({ op: "set", path: "/pricing", value: args.input.pricing });
                ops.push({ op: "set", path: "/skus/0/price", value: { amount: basePrice, currency: currency } });
            }
            if (args.input.deliveryFormats !== undefined) ops.push({ op: "set", path: "/deliveryFormats", value: args.input.deliveryFormats.map((f: string) => ({ format: f })) });
            if (args.input.turnaroundDays !== undefined) ops.push({ op: "set", path: "/turnaroundDays", value: args.input.turnaroundDays });
            if (args.input.addOns !== undefined) ops.push({ op: "set", path: "/addOns", value: args.input.addOns });
            if (args.input.questionnaire !== undefined) ops.push({ op: "set", path: "/questionnaire", value: args.input.questionnaire });
            if (args.input.targetTimezones !== undefined) ops.push({ op: "set", path: "/targetTimezones", value: args.input.targetTimezones });
            if (args.input.coachingOptions !== undefined) ops.push({ op: "set", path: "/coachingOptions", value: args.input.coachingOptions });
            if (args.input.requiresConsultation !== undefined) {
                const deliveryMode = args.input.requiresConsultation ? "SYNC" : "ASYNC";
                ops.push({ op: "set", path: "/deliveryMode", value: deliveryMode });
            }
            if (args.input.bookingType !== undefined) ops.push({ op: "set", path: "/bookingType", value: args.input.bookingType });
            if (args.input.scheduleId !== undefined) ops.push({ op: "set", path: "/scheduleId", value: args.input.scheduleId });

            if (ops.length > 0) {
                await container.item(args.input.id, args.merchantId).patch(ops);
            }

            return await context.dataSources.cosmos.get_record("Main-Listing", args.input.id, args.merchantId);
        },

        upload_service_deliverable: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const orderId = args.input.orderId;

            // Get the order
            const orders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @orderId",
                parameters: [{ name: "@orderId", value: orderId }]
            }, true);

            if (!orders || orders.length === 0) {
                throw new Error("Service order not found");
            }

            const order = orders[0];

            // Debug: log the order's partition key fields
            console.log(`[upload_service_deliverable] Order found: id=${order.id}, type=${order.type}, customerEmail=${order.customerEmail}, userId=${order.userId}`);

            // Verify this is the vendor's order
            if (order.vendorId !== args.vendorId && order.service?.vendorId !== args.vendorId) {
                throw new Error("Unauthorized: You can only upload deliverables for your own orders");
            }

            // Validate order status (using orderStatus field to avoid conflict with Cosmos soft-delete)
            if (order.orderStatus !== "PAID" && order.orderStatus !== "IN_PROGRESS") {
                throw new Error(`Cannot upload deliverables for order with status: ${order.orderStatus}`);
            }

            // Prepare deliverables
            const existingFiles = order.deliverables?.files || [];
            const newFiles = args.input.files.map((file: any) => ({
                id: uuidv4(),
                ...file,
                uploadedAt: new Date().toISOString()
            }));

            const deliverables = {
                files: [...existingFiles, ...newFiles],
                message: args.input.message || order.deliverables?.message,
                deliveredAt: order.deliverables?.deliveredAt
            };

            // Get partition key - service orders use ["SERVICE", customerEmail] partition per Bicep config
            // For older orders without customerEmail/userId, fall back to using upsert which doesn't need partition
            const partitionEmail = order.customerEmail || order.userId;

            // Build the updated order object
            const updatedOrder = {
                ...order,
                deliverables,
                orderStatus: "IN_PROGRESS",
                // Ensure partition key fields are set for future operations
                type: order.type || "SERVICE",
                customerEmail: order.customerEmail || undefined,
                userId: order.userId || order.customerEmail || undefined
            };

            if (!partitionEmail) {
                // Legacy order without partition key fields - use upsert
                console.log(`[upload_service_deliverable] Legacy order without partition fields, using upsert for orderId=${orderId}`);
                await context.dataSources.cosmos.upsert_record("Main-Bookings", orderId, updatedOrder);

                // Query back the order to return it
                const updatedOrders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                    query: "SELECT * FROM c WHERE c.id = @orderId",
                    parameters: [{ name: "@orderId", value: orderId }]
                }, true);
                return updatedOrders[0];
            }

            const partition = ["SERVICE", partitionEmail];
            console.log(`[upload_service_deliverable] orderId=${orderId}, customerEmail=${partitionEmail}, partition=${JSON.stringify(partition)}`);

            // Update order with patch operations (using orderStatus field)
            const ops: PatchOperation[] = [
                {
                    op: "set",
                    path: "/deliverables",
                    value: deliverables
                },
                {
                    op: "set",
                    path: "/orderStatus",
                    value: "IN_PROGRESS"
                }
            ];

            await context.dataSources.cosmos.patch_record("Main-Bookings", orderId, partition, ops, context.userId);

            return await context.dataSources.cosmos.get_record("Main-Bookings", orderId, partition);
        },

        mark_service_delivered: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const orderId = args.orderId;

            // Get the order
            const orders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @orderId",
                parameters: [{ name: "@orderId", value: orderId }]
            }, true);

            if (!orders || orders.length === 0) {
                throw new Error("Service order not found");
            }

            const order = orders[0];

            // Debug: log the order's partition key fields
            console.log(`[mark_service_delivered] Order found: id=${order.id}, type=${order.type}, customerEmail=${order.customerEmail}, userId=${order.userId}`);

            // Verify this is the vendor's order
            if (order.vendorId !== args.vendorId && order.service?.vendorId !== args.vendorId) {
                throw new Error("Unauthorized: You can only mark your own orders as delivered");
            }

            // Validate has deliverables
            if (!order.deliverables?.files || order.deliverables.files.length === 0) {
                throw new Error("Cannot mark as delivered: No deliverables uploaded yet");
            }

            // Get partition key - service orders use ["SERVICE", customerEmail] partition per Bicep config
            // For older orders without customerEmail/userId, fall back to using upsert
            const partitionEmail = order.customerEmail || order.userId;
            console.log(`[mark_service_delivered] partitionEmail=${partitionEmail}`);

            // Build the updated order object for upsert fallback
            const updatedOrder = {
                ...order,
                orderStatus: "DELIVERED",
                deliverables: {
                    ...order.deliverables,
                    deliveredAt: new Date().toISOString()
                },
                // Ensure partition key fields are set for future operations
                type: order.type || "SERVICE"
            };

            if (!partitionEmail) {
                // Legacy order without partition key fields - use upsert
                console.log(`[mark_service_delivered] Legacy order without partition fields, using upsert for orderId=${orderId}`);
                await context.dataSources.cosmos.upsert_record("Main-Bookings", orderId, updatedOrder);

                // Query back the order to return it
                const updatedOrders = await context.dataSources.cosmos.run_query("Main-Bookings", {
                    query: "SELECT * FROM c WHERE c.id = @orderId",
                    parameters: [{ name: "@orderId", value: orderId }]
                }, true);

                // Auto-extract loved ones for mediumship readings
                // Note: Use order.customerId (actual user ID) not order.userId (which is the email for partition key)
                if (order.service?.readingOptions?.readingType && isMediumshipReading(order.service.readingOptions.readingType) && order.customerId) {
                    const deliveryMessage = order.deliverables?.message || '';
                    const extractedLovedOnes = extractLovedOnesFromText(deliveryMessage);

                    if (extractedLovedOnes.length > 0) {
                        console.log(`[mark_service_delivered] Auto-extracting ${extractedLovedOnes.length} loved ones for customer ${order.customerId}`);

                        // Add each loved one to the customer's personal space
                        for (const lovedOne of extractedLovedOnes) {
                            try {
                                const now = DateTime.now().toISO()!;
                                const lovedOneRecord = {
                                    id: uuidv4(),
                                    userId: order.customerId,
                                    docType: "LOVED_ONE_SPIRIT",
                                    name: lovedOne.name,
                                    relationship: lovedOne.relationship || 'Spirit',
                                    createdAt: now,
                                    updatedAt: now,
                                };

                                await context.dataSources.cosmos.upsert_record("Main-PersonalSpace", lovedOneRecord.id, lovedOneRecord, [order.customerId]);
                                console.log(`[mark_service_delivered] ✓ Added loved one: ${lovedOne.name} (${lovedOne.relationship || 'Spirit'})`);
                            } catch (error) {
                                console.error(`[mark_service_delivered] Failed to auto-add loved one ${lovedOne.name}:`, error);
                            }
                        }
                    }
                }

                // TODO: Send email notification to customer (SERVICE_DELIVERED_CUSTOMER)
                // TODO: Send email notification to practitioner (SERVICE_DELIVERED_PRACTITIONER)

                return updatedOrders[0];
            }

            const partition = ["SERVICE", partitionEmail];

            // Update order status (using orderStatus field to avoid conflict with Cosmos soft-delete)
            const ops: PatchOperation[] = [
                {
                    op: "set",
                    path: "/orderStatus",
                    value: "DELIVERED"
                },
                {
                    op: "set",
                    path: "/deliverables/deliveredAt",
                    value: new Date().toISOString()
                }
            ];

            await context.dataSources.cosmos.patch_record("Main-Bookings", orderId, partition, ops, context.userId);

            // Auto-extract loved ones for mediumship readings
            // Note: Use order.customerId (actual user ID) not order.userId (which is the email for partition key)
            if (order.service?.readingOptions?.readingType && isMediumshipReading(order.service.readingOptions.readingType) && order.customerId) {
                const deliveryMessage = order.deliverables?.message || '';
                const extractedLovedOnes = extractLovedOnesFromText(deliveryMessage);

                if (extractedLovedOnes.length > 0) {
                    console.log(`[mark_service_delivered] Auto-extracting ${extractedLovedOnes.length} loved ones for customer ${order.customerId}`);

                    // Add each loved one to the customer's personal space
                    for (const lovedOne of extractedLovedOnes) {
                        try {
                            const now = DateTime.now().toISO()!;
                            const lovedOneRecord = {
                                id: uuidv4(),
                                userId: order.customerId,
                                docType: "LOVED_ONE_SPIRIT",
                                name: lovedOne.name,
                                relationship: lovedOne.relationship || 'Spirit',
                                createdAt: now,
                                updatedAt: now,
                            };

                            await context.dataSources.cosmos.upsert_record("Main-PersonalSpace", lovedOneRecord.id, lovedOneRecord, [order.customerId]);
                            console.log(`[mark_service_delivered] ✓ Added loved one: ${lovedOne.name} (${lovedOne.relationship || 'Spirit'})`);
                        } catch (error) {
                            // Log error but don't fail the delivery
                            console.error(`[mark_service_delivered] Failed to auto-add loved one ${lovedOne.name}:`, error);
                        }
                    }
                }
            }

            // TODO: Send email notification to customer (SERVICE_DELIVERED_CUSTOMER)
            // TODO: Send email notification to practitioner (SERVICE_DELIVERED_PRACTITIONER)

            return await context.dataSources.cosmos.get_record("Main-Bookings", orderId, partition);
        },

        create_service_checkout_link: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { serviceId, customerEmail, questionnaireResponses, selectedAddOns, expiresInHours } = args.input;

            // Get the service
            const services = await context.dataSources.cosmos.run_query("Main-Listing", {
                query: "SELECT * FROM c WHERE c.id = @serviceId AND c.type = 'SERVICE'",
                parameters: [{ name: "@serviceId", value: serviceId }]
            }, true);

            if (!services || services.length === 0) {
                throw new Error("Service not found");
            }

            const service = services[0];

            // Verify this is the vendor's service
            if (service.vendorId !== args.vendorId) {
                throw new Error("Unauthorized: You can only create checkout links for your own services");
            }

            // Calculate price
            let price = 0;
            let currency = "USD";
            if (service.pricing.type === "FIXED" && service.pricing.fixedPrice) {
                price = service.pricing.fixedPrice.amount;
                currency = service.pricing.fixedPrice.currency;
            } else if (service.pricing.type === "PACKAGE" && service.pricing.packages && service.pricing.packages.length > 0) {
                price = service.pricing.packages[0].price.amount;
                currency = service.pricing.packages[0].price.currency;
            } else if (service.pricing.type === "HOURLY" && service.pricing.hourlyRate) {
                price = service.pricing.hourlyRate.amount;
                currency = service.pricing.hourlyRate.currency;
            }

            // Add add-on prices
            if (selectedAddOns && selectedAddOns.length > 0) {
                selectedAddOns.forEach((addOnId: string) => {
                    const addOn = service.addOns?.find((a: any) => a.id === addOnId);
                    if (addOn) price += addOn.price.amount;
                });
            }

            // Create pending order
            const orderId = uuidv4();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));

            const order = {
                id: orderId,
                docType: "SERVICE_ORDER",
                // type and customerEmail/userId are the hierarchical partition key fields for Main-Bookings
                type: "SERVICE",
                userId: customerEmail, // Use customerEmail for userId to match partition key path
                customerId: null, // Will be set when customer pays
                customerEmail,
                vendorId: args.vendorId,
                serviceId,
                service,
                status: "PENDING_PAYMENT",
                purchaseDate: new Date().toISOString(),
                questionnaireResponses: questionnaireResponses || [],
                selectedAddOns: selectedAddOns || [],
                price: {
                    amount: price,
                    currency
                },
                checkoutLinkExpiresAt: expiresAt.toISOString(),
                createdBy: context.userId,
                createdDate: new Date().toISOString()
            };

            // Partition key is [/type, /customerEmail] per Bicep config
            await context.dataSources.cosmos.add_record("Main-Bookings", order, ["SERVICE", customerEmail], context.userId);

            // Generate checkout URL
            const checkoutUrl = `${process.env.FRONTEND_URL}/m/${service.vendor?.slug || args.vendorId}/checkout/service/${orderId}`;

            return {
                code: "200",
                success: true,
                message: "Checkout link created successfully",
                checkoutUrl,
                orderId,
                expiresAt: expiresAt.toISOString()
            };
        },

        // ==========================================
        // Practitioner Availability & Live Booking Mutations
        // ==========================================

        updatePractitionerSchedule: async (_: any, args: { practitionerId: string, input: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { practitionerId, input } = args;

            try {
                // Check if schedule exists
                const existingSchedules = await context.dataSources.cosmos.run_query("Main-PractitionerSchedules", {
                    query: "SELECT * FROM c WHERE c.practitionerId = @practitionerId",
                    parameters: [{ name: "@practitionerId", value: practitionerId }]
                }, true);

                const now = new Date().toISOString();
                const scheduleId = practitionerId; // Use practitionerId as the schedule ID

                if (existingSchedules && existingSchedules.length > 0) {
                    // Update existing schedule
                    const existingSchedule = existingSchedules[0] as practitionerSchedule_type;
                    const updatedSchedule: practitionerSchedule_type = {
                        ...existingSchedule,
                        timezone: input.timezone,
                        country: input.country,
                        weekdays: input.weekdays,
                        deliveryMethods: input.deliveryMethods,
                        updatedDate: now,
                        serviceIds: input.serviceIds !== undefined ? (input.serviceIds || []) : existingSchedule.serviceIds,
                        bufferMinutes: input.bufferMinutes !== undefined ? input.bufferMinutes : existingSchedule.bufferMinutes,
                        advanceBookingDays: input.advanceBookingDays !== undefined ? input.advanceBookingDays : existingSchedule.advanceBookingDays,
                        minimumNoticeHours: input.minimumNoticeHours !== undefined ? input.minimumNoticeHours : existingSchedule.minimumNoticeHours
                    };

                    await context.dataSources.cosmos.update_record("Main-PractitionerSchedules", scheduleId, practitionerId, updatedSchedule, context.userId);
                } else {
                    // Create new schedule
                    const newSchedule = {
                        id: scheduleId,
                        practitionerId,
                        timezone: input.timezone,
                        country: input.country,
                        weekdays: input.weekdays,
                        dateOverrides: [],
                        serviceIds: input.serviceIds || [],
                        bufferMinutes: input.bufferMinutes || 15,
                        advanceBookingDays: input.advanceBookingDays || 30,
                        minimumNoticeHours: input.minimumNoticeHours || 24,
                        deliveryMethods: input.deliveryMethods,
                        createdDate: now,
                        updatedDate: now
                    };

                    await context.dataSources.cosmos.add_record("Main-PractitionerSchedules", newSchedule, practitionerId, context.userId);
                }

                // Fetch and return updated schedule
                const schedule = await context.dataSources.cosmos.get_record<practitionerSchedule_type>("Main-PractitionerSchedules", scheduleId, practitionerId);
                return {
                    ...schedule,
                    ref: { id: scheduleId, partition: [practitionerId], container: "Main-PractitionerSchedules" }
                };
            } catch (error: any) {
                throw error;
            }
        },

        setPractitionerDateOverride: async (_: any, args: { practitionerId: string, input: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { practitionerId, input } = args;
            const scheduleId = practitionerId;

            // Fetch existing schedule
            const schedule = await context.dataSources.cosmos.get_record<practitionerSchedule_type>("Main-PractitionerSchedules", scheduleId, practitionerId);
            if (!schedule) {
                throw new Error("Practitioner schedule not found. Please set up availability first.");
            }

            const dateOverrides = schedule.dateOverrides || [];
            const existingIndex = dateOverrides.findIndex((o: any) => o.date === input.date);

            const newOverride = {
                date: typeof input.date === 'object' ? DateTime.fromJSDate(input.date).toISODate() : input.date,
                type: input.type,
                timeSlots: input.timeSlots,
                reason: input.reason
            };

            if (existingIndex >= 0) {
                dateOverrides[existingIndex] = newOverride;
            } else {
                dateOverrides.push(newOverride);
            }

            const updatedScheduleData: practitionerSchedule_type = {
                ...schedule,
                dateOverrides,
                updatedDate: new Date().toISOString()
            };

            await context.dataSources.cosmos.update_record("Main-PractitionerSchedules", scheduleId, practitionerId, updatedScheduleData, context.userId);

            return {
                ...updatedScheduleData,
                ref: { id: scheduleId, partition: [practitionerId], container: "Main-PractitionerSchedules" }
            };
        },

        removePractitionerDateOverride: async (_: any, args: { practitionerId: string, date: Date }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { practitionerId, date } = args;
            const scheduleId = practitionerId;
            const dateStr = typeof date === 'object' ? DateTime.fromJSDate(date).toISODate() : date;

            const schedule = await context.dataSources.cosmos.get_record<practitionerSchedule_type>("Main-PractitionerSchedules", scheduleId, practitionerId);
            if (!schedule) {
                throw new Error("Practitioner schedule not found.");
            }

            const dateOverrides = (schedule.dateOverrides || []).filter((o: any) => o.date !== dateStr);

            const updatedScheduleData: practitionerSchedule_type = {
                ...schedule,
                dateOverrides,
                updatedDate: new Date().toISOString()
            };

            await context.dataSources.cosmos.update_record("Main-PractitionerSchedules", scheduleId, practitionerId, updatedScheduleData, context.userId);

            return {
                ...updatedScheduleData,
                ref: { id: scheduleId, partition: [practitionerId], container: "Main-PractitionerSchedules" }
            };
        },

        bookScheduledService: async (_: any, args: { input: any }, context: serverContext) => {
            const { input } = args;
            const {
                vendorId, serviceId, customerId, customerEmail,
                date, startTime, endTime, customerTimezone,
                deliveryMethod, customerAddress, questionnaireResponses, selectedAddOns
            } = input;

            // Fetch service
            const service = await context.dataSources.cosmos.get_record<service_type>("Main-Listing", serviceId, vendorId);
            if (!service) {
                return { code: "404", success: false, message: "Service not found", booking: null, clientSecret: null };
            }

            // Fetch practitioner schedule
            const schedules = await context.dataSources.cosmos.run_query("Main-PractitionerSchedules", {
                query: "SELECT * FROM c WHERE c.practitionerId = @vendorId",
                parameters: [{ name: "@vendorId", value: vendorId }]
            }, true);

            if (!schedules || schedules.length === 0) {
                return { code: "400", success: false, message: "Practitioner has not set up availability", booking: null, clientSecret: null };
            }

            const schedule = schedules[0];
            const practitionerTz = schedule.timezone || "America/New_York";
            const dateStr = typeof date === 'object' ? DateTime.fromJSDate(date).toISODate() : date;

            // Calculate price
            let price = 0;
            let currency = "usd";
            if (service.pricing?.type === "FIXED" && service.pricing.fixedPrice) {
                price = service.pricing.fixedPrice.amount;
                currency = service.pricing.fixedPrice.currency || "usd";
            } else if (service.pricing?.type === "HOURLY" && service.pricing.ratePerHour) {
                const durationMinutes = service.duration?.amount || 60;
                const durationHours = service.duration?.unit?.id === "hour" ? service.duration.amount : durationMinutes / 60;
                price = service.pricing.ratePerHour.amount * durationHours;
                currency = service.pricing.ratePerHour.currency || "usd";
            } else if (service.ratePerHour) {
                const durationMinutes = service.duration?.amount || 60;
                const durationHours = service.duration?.unit?.id === "hour" ? service.duration.amount : durationMinutes / 60;
                price = service.ratePerHour.amount * durationHours;
                currency = service.ratePerHour.currency || "usd";
            }

            // Add travel surcharge for mobile delivery
            if (deliveryMethod === "MOBILE" && schedule.deliveryMethods?.mobile?.travelSurcharge) {
                price += schedule.deliveryMethods.mobile.travelSurcharge.amount;
            }

            // Add add-on prices
            if (selectedAddOns && selectedAddOns.length > 0 && service.addOns) {
                for (const addOnId of selectedAddOns) {
                    const addOn = service.addOns.find((a: any) => a.id === addOnId);
                    if (addOn?.price) {
                        price += addOn.price.amount;
                    }
                }
            }

            // Fetch vendor for Stripe account
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", vendorId, vendorId);
            if (!vendor?.stripe?.accountId) {
                return { code: "400", success: false, message: "Vendor has not completed Stripe setup", booking: null, clientSecret: null };
            }

            // Create Stripe PaymentIntent with manual capture
            const stripeAccountId = vendor.stripe.accountId;
            const priceInCents = Math.round(price * 100);

            // Calculate platform fee from config
            const feeConfig = await getSpiriverseFeeConfig({ cosmos: context.dataSources.cosmos });
            const targetFee = getTargetFeeConfig('service-booking', feeConfig);
            const applicationFeeAmount = Math.round(priceInCents * (targetFee.percent / 100)) + (targetFee.fixed || 0);

            const paymentIntentData = {
                amount: priceInCents,
                currency: currency.toLowerCase(),
                capture_method: 'manual',
                application_fee_amount: applicationFeeAmount,
                metadata: {
                    vendorId,
                    serviceId,
                    customerId,
                    bookingType: 'SCHEDULED_SERVICE'
                }
            };

            let paymentIntent;
            try {
                const stripeDataSource = context.dataSources.stripe.asConnectedAccount(stripeAccountId);
                paymentIntent = await stripeDataSource.callApi("POST", "payment_intents", paymentIntentData);
            } catch (error: any) {
                console.error("Stripe PaymentIntent creation failed:", error);
                return { code: "500", success: false, message: "Failed to create payment authorization", booking: null, clientSecret: null };
            }

            // Calculate confirmation deadline (24 hours from now)
            const confirmationDeadline = DateTime.now().plus({ hours: 24 }).toISO();

            // Create scheduled datetime object
            const slotStart = DateTime.fromISO(`${dateStr}T${startTime}`, { zone: practitionerTz });
            const slotEnd = DateTime.fromISO(`${dateStr}T${endTime}`, { zone: practitionerTz });

            const scheduledDateTime = {
                date: dateStr,
                time: {
                    start: startTime,
                    end: endTime,
                    duration_ms: slotEnd.diff(slotStart).as('milliseconds')
                },
                practitionerTimezone: practitionerTz,
                customerTimezone: customerTimezone,
                utcDateTime: slotStart.toUTC().toISO()
            };

            // Create booking record
            const bookingId = uuidv4();
            const booking = {
                id: bookingId,
                type: "SERVICE",
                docType: "SERVICE_BOOKING",
                customerId,
                customerEmail,
                vendorId,
                serviceId,
                listingId: serviceId,
                service,
                purchaseDate: new Date().toISOString(),
                date: dateStr,
                time: scheduledDateTime.time,
                scheduledDateTime,
                price: { amount: price, currency },
                orderStatus: "PAID", // Will be marked PAID once captured
                confirmationStatus: "PENDING_CONFIRMATION",
                confirmationDeadline,
                deliveryMethod,
                customerAddress: deliveryMethod === "MOBILE" ? customerAddress : undefined,
                stripePaymentIntentId: paymentIntent.id,
                stripe: {
                    accountId: stripeAccountId,
                    paymentIntent: { id: paymentIntent.id, account: stripeAccountId },
                    paymentIntentSecret: paymentIntent.client_secret,
                    amount: { amount: price, currency }
                },
                questionnaireResponses: questionnaireResponses || [],
                selectedAddOns: selectedAddOns || [],
                remindersSent: {},
                createdDate: new Date().toISOString()
            };

            // Partition key for Main-Bookings is [type, userId]
            await context.dataSources.cosmos.add_record("Main-Bookings", booking, ["SERVICE", customerId], bookingId);

            // Send notification email to practitioner about new pending booking
            try {
                const customer = await context.dataSources.cosmos.get_record<user_type>("Main-User", customerId, customerId);
                const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", vendorId, vendorId);

                const customerName = customer ? `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Customer' : 'Customer';
                const practitionerName = practitioner?.name || 'Practitioner';
                const deliveryMethodDisplay = deliveryMethod === 'ONLINE' ? 'Online Session' :
                    deliveryMethod === 'AT_PRACTITIONER' ? 'At Your Location' :
                    deliveryMethod === 'MOBILE' ? 'Mobile (You travel to customer)' : deliveryMethod;
                const amountDisplay = `$${price.toFixed(2)} ${currency.toUpperCase()}`;
                const bookingDateDisplay = DateTime.fromISO(dateStr).toFormat('EEEE, MMMM d, yyyy');
                const bookingTimeDisplay = `${startTime} - ${endTime}`;
                const confirmationDeadlineDisplay = DateTime.fromISO(confirmationDeadline).toFormat('MMMM d, yyyy h:mm a');
                const dashboardUrl = practitioner?.slug ? `https://spiriverse.com/p/${practitioner.slug}/manage/bookings` : 'https://spiriverse.com';

                const emailContent = await renderEmailTemplate(context.dataSources, 'booking-pending-practitioner', {
                    practitionerName,
                    serviceName: service.name,
                    customerName,
                    customerEmail,
                    bookingDate: bookingDateDisplay,
                    bookingTime: bookingTimeDisplay,
                    deliveryMethod: deliveryMethodDisplay,
                    amount: amountDisplay,
                    confirmationDeadline: confirmationDeadlineDisplay,
                    dashboardUrl
                });

                if (emailContent && practitioner?.contact?.internal?.email) {
                    await context.dataSources.email.sendRawHtmlEmail(
                        sender_details.from,
                        practitioner.contact?.internal?.email,
                        emailContent.subject,
                        emailContent.html
                    );
                }
            } catch (emailError) {
                console.error("Failed to send booking notification email to practitioner:", emailError);
            }

            return {
                code: "200",
                success: true,
                message: "Booking created successfully. Awaiting practitioner confirmation.",
                booking: {
                    ...booking,
                    ref: { id: bookingId, partition: ["SERVICE", customerId], container: "Main-Bookings" }
                },
                clientSecret: paymentIntent.client_secret
            };
        },

        confirmBooking: async (_: any, args: { practitionerId: string, bookingId: string, meetingLink?: string, meetingPasscode?: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { practitionerId, bookingId, meetingLink, meetingPasscode } = args;

            // Find the booking
            const bookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @bookingId AND c.vendorId = @practitionerId",
                parameters: [
                    { name: "@bookingId", value: bookingId },
                    { name: "@practitionerId", value: practitionerId }
                ]
            }, true);

            if (!bookings || bookings.length === 0) {
                throw new Error("Booking not found");
            }

            const booking = bookings[0];

            if (booking.confirmationStatus !== "PENDING_CONFIRMATION") {
                throw new Error(`Cannot confirm booking with status: ${booking.confirmationStatus}`);
            }

            // Capture the Stripe payment
            if (booking.stripePaymentIntentId && booking.stripe?.accountId) {
                try {
                    const stripeDataSource = context.dataSources.stripe.asConnectedAccount(booking.stripe.accountId);
                    await stripeDataSource.callApi("POST", `payment_intents/${booking.stripePaymentIntentId}/capture`, {});
                } catch (error: any) {
                    console.error("Failed to capture payment:", error);
                    throw new Error("Failed to capture payment. Please try again.");
                }
            }

            // Get practitioner address if AT_PRACTITIONER delivery
            let practitionerAddress: string | undefined;
            if (booking.deliveryMethod === "AT_PRACTITIONER") {
                const schedules = await context.dataSources.cosmos.run_query("Main-PractitionerSchedules", {
                    query: "SELECT * FROM c WHERE c.practitionerId = @practitionerId",
                    parameters: [{ name: "@practitionerId", value: practitionerId }]
                }, true);
                if (schedules && schedules.length > 0) {
                    const schedule = schedules[0];
                    if (schedule.deliveryMethods?.atPractitionerLocation?.location) {
                        practitionerAddress = schedule.deliveryMethods.atPractitionerLocation.location.formatted_address;
                    }
                }
            }

            // Update booking
            const updatedBookingData: serviceBooking_type = {
                ...booking,
                confirmationStatus: "CONFIRMED",
                orderStatus: "PAID",
                confirmedDate: new Date().toISOString(),
                ...(meetingLink && { meetingLink }),
                ...(meetingPasscode && { meetingPasscode }),
                ...(practitionerAddress && { practitionerAddress })
            };

            await context.dataSources.cosmos.update_record("Main-Bookings", bookingId, ["SERVICE", booking.customerId], updatedBookingData, context.userId);

            // Send confirmation emails
            try {
                // Fetch customer and practitioner details for email
                const customer = await context.dataSources.cosmos.get_record<user_type>("Main-User", booking.customerId, booking.customerId);
                const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", practitionerId, practitionerId);

                const customerName = customer ? `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Customer' : 'Customer';
                const practitionerName = practitioner?.name || 'Practitioner';
                const serviceName = booking.service?.name || 'Service';
                const bookingDate = DateTime.fromISO(booking.scheduledDateTime?.date || booking.date).toFormat('EEEE, MMMM d, yyyy');
                const bookingTime = `${booking.scheduledDateTime?.time?.start || ''} - ${booking.scheduledDateTime?.time?.end || ''}`;
                const deliveryMethod = booking.deliveryMethod === 'ONLINE' ? 'Online Session' :
                    booking.deliveryMethod === 'AT_PRACTITIONER' ? 'At Practitioner Location' :
                    booking.deliveryMethod === 'MOBILE' ? 'Mobile (Practitioner travels to you)' : booking.deliveryMethod;
                const amount = booking.price ? `$${booking.price.amount.toFixed(2)} ${booking.price.currency?.toUpperCase() || 'USD'}` : '';

                // Send email to customer
                const customerEmailContent = await renderEmailTemplate(context.dataSources, 'booking-confirmed-customer', {
                    customerName,
                    practitionerName,
                    serviceName,
                    bookingDate,
                    bookingTime,
                    deliveryMethod,
                    meetingLink: meetingLink || '',
                    meetingPasscode: meetingPasscode || '',
                    practitionerAddress: practitionerAddress || ''
                });

                if (customerEmailContent && booking.customerEmail) {
                    await context.dataSources.email.sendRawHtmlEmail(
                        sender_details.from,
                        booking.customerEmail,
                        customerEmailContent.subject,
                        customerEmailContent.html
                    );
                }

                // Send confirmation receipt to practitioner
                const practitionerEmailContent = await renderEmailTemplate(context.dataSources, 'booking-confirmed-practitioner', {
                    practitionerName,
                    customerName,
                    customerEmail: booking.customerEmail,
                    serviceName,
                    bookingDate,
                    bookingTime,
                    deliveryMethod,
                    amount,
                    customerAddress: booking.customerAddress?.formattedAddress || booking.customerAddress?.formatted_address || ''
                });

                if (practitionerEmailContent && practitioner?.contact?.internal?.email) {
                    await context.dataSources.email.sendRawHtmlEmail(
                        sender_details.from,
                        practitioner.contact?.internal?.email,
                        practitionerEmailContent.subject,
                        practitionerEmailContent.html
                    );
                }
            } catch (emailError) {
                // Log but don't fail the booking confirmation if email fails
                console.error("Failed to send booking confirmation emails:", emailError);
            }

            return {
                ...updatedBookingData,
                ref: { id: bookingId, partition: ["SERVICE", booking.customerId], container: "Main-Bookings" }
            };
        },

        rejectBooking: async (_: any, args: { practitionerId: string, bookingId: string, reason: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { practitionerId, bookingId, reason } = args;

            // Find the booking
            const bookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @bookingId AND c.vendorId = @practitionerId",
                parameters: [
                    { name: "@bookingId", value: bookingId },
                    { name: "@practitionerId", value: practitionerId }
                ]
            }, true);

            if (!bookings || bookings.length === 0) {
                throw new Error("Booking not found");
            }

            const booking = bookings[0];

            if (booking.confirmationStatus !== "PENDING_CONFIRMATION") {
                throw new Error(`Cannot reject booking with status: ${booking.confirmationStatus}`);
            }

            // Cancel the Stripe payment intent to release the authorization
            if (booking.stripePaymentIntentId && booking.stripe?.accountId) {
                try {
                    const stripeDataSource = context.dataSources.stripe.asConnectedAccount(booking.stripe.accountId);
                    await stripeDataSource.callApi("POST", `payment_intents/${booking.stripePaymentIntentId}/cancel`, {});
                } catch (error: any) {
                    console.error("Failed to cancel payment intent:", error);
                    // Continue with rejection even if Stripe fails - the authorization will expire
                }
            }

            // Update booking
            const updatedBookingData: serviceBooking_type = {
                ...booking,
                confirmationStatus: "REJECTED",
                orderStatus: "CANCELLED",
                rejectionReason: reason,
                rejectedDate: new Date().toISOString()
            };

            await context.dataSources.cosmos.update_record("Main-Bookings", bookingId, ["SERVICE", booking.customerId], updatedBookingData, context.userId);

            // Send rejection email to customer
            try {
                const customer = await context.dataSources.cosmos.get_record<user_type>("Main-User", booking.customerId, booking.customerId);
                const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", practitionerId, practitionerId);

                const customerName = customer ? `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Customer' : 'Customer';
                const practitionerName = practitioner?.name || 'Practitioner';
                const serviceName = booking.service?.name || 'Service';
                const bookingDate = DateTime.fromISO(booking.scheduledDateTime?.date || booking.date).toFormat('EEEE, MMMM d, yyyy');
                const bookingTime = `${booking.scheduledDateTime?.time?.start || ''} - ${booking.scheduledDateTime?.time?.end || ''}`;
                const practitionerProfileUrl = practitioner?.slug ? `https://spiriverse.com/p/${practitioner.slug}` : 'https://spiriverse.com';

                const emailContent = await renderEmailTemplate(context.dataSources, 'booking-rejected-customer', {
                    customerName,
                    practitionerName,
                    serviceName,
                    bookingDate,
                    bookingTime,
                    rejectionReason: reason,
                    practitionerProfileUrl
                });

                if (emailContent && booking.customerEmail) {
                    await context.dataSources.email.sendRawHtmlEmail(
                        sender_details.from,
                        booking.customerEmail,
                        emailContent.subject,
                        emailContent.html
                    );
                }
            } catch (emailError) {
                console.error("Failed to send booking rejection email:", emailError);
            }

            return {
                ...updatedBookingData,
                ref: { id: bookingId, partition: ["SERVICE", booking.customerId], container: "Main-Bookings" }
            };
        },

        cancelScheduledBooking: async (_: any, args: { bookingId: string, cancelledBy: string, reason?: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { bookingId, cancelledBy, reason } = args;

            // Find the booking - we need to search since we don't know the customerId
            const bookings = await context.dataSources.cosmos.run_query<serviceBooking_type>("Main-Bookings", {
                query: "SELECT * FROM c WHERE c.id = @bookingId",
                parameters: [{ name: "@bookingId", value: bookingId }]
            }, true);

            if (!bookings || bookings.length === 0) {
                return {
                    code: "404",
                    success: false,
                    message: "Booking not found",
                    booking: null
                };
            }

            const booking = bookings[0];

            // Only allow cancellation of PENDING_CONFIRMATION or CONFIRMED bookings
            if (!['PENDING_CONFIRMATION', 'CONFIRMED'].includes(booking.confirmationStatus || '')) {
                return {
                    code: "400",
                    success: false,
                    message: `Cannot cancel booking with status: ${booking.confirmationStatus}`,
                    booking: null
                };
            }

            // Verify the user is authorized (customer or practitioner)
            const isCustomer = context.userId === booking.customerId;
            const isPractitioner = context.userId === booking.vendorId;

            if (!isCustomer && !isPractitioner) {
                return {
                    code: "403",
                    success: false,
                    message: "Not authorized to cancel this booking",
                    booking: null
                };
            }

            // Cancel or refund the Stripe payment
            if (booking.stripePaymentIntentId && booking.stripe?.accountId) {
                try {
                    const stripeDataSource = context.dataSources.stripe.asConnectedAccount(booking.stripe.accountId);

                    if (booking.confirmationStatus === 'PENDING_CONFIRMATION') {
                        // Cancel the payment intent (releases authorization)
                        await stripeDataSource.callApi("POST", `payment_intents/${booking.stripePaymentIntentId}/cancel`, {});
                    } else if (booking.confirmationStatus === 'CONFIRMED') {
                        // Refund the captured payment
                        await stripeDataSource.callApi("POST", `refunds`, {
                            payment_intent: booking.stripePaymentIntentId
                        });
                    }
                } catch (error: any) {
                    console.error("Failed to process payment cancellation/refund:", error);
                    // Continue with cancellation even if Stripe fails
                }
            }

            // Update booking status
            const updatedBookingData: serviceBooking_type = {
                ...booking,
                confirmationStatus: "CANCELLED" as any,
                orderStatus: "CANCELLED",
                cancelledDate: new Date().toISOString(),
                cancelledBy,
                cancellationReason: reason
            };

            await context.dataSources.cosmos.update_record("Main-Bookings", bookingId, ["SERVICE", booking.customerId], updatedBookingData, context.userId);

            // Send cancellation emails
            try {
                const customer = await context.dataSources.cosmos.get_record<user_type>("Main-User", booking.customerId, booking.customerId);
                const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", booking.vendorId, booking.vendorId);

                const customerName = customer ? `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'Customer' : 'Customer';
                const practitionerName = practitioner?.name || 'Practitioner';
                const serviceName = booking.service?.name || 'Service';
                const bookingDate = DateTime.fromISO(booking.scheduledDateTime?.date || booking.date).toFormat('EEEE, MMMM d, yyyy');
                const bookingTime = `${booking.scheduledDateTime?.time?.start || ''} - ${booking.scheduledDateTime?.time?.end || ''}`;

                // Send to customer (if practitioner cancelled)
                if (cancelledBy === 'PRACTITIONER' && booking.customerEmail) {
                    const customerEmailContent = await renderEmailTemplate(context.dataSources, 'booking-cancelled-customer', {
                        customerName,
                        practitionerName,
                        serviceName,
                        bookingDate,
                        bookingTime,
                        cancellationReason: reason || 'No reason provided',
                        practitionerProfileUrl: practitioner?.slug ? `https://spiriverse.com/p/${practitioner.slug}` : 'https://spiriverse.com'
                    });

                    if (customerEmailContent) {
                        await context.dataSources.email.sendRawHtmlEmail(
                            sender_details.from,
                            booking.customerEmail,
                            customerEmailContent.subject,
                            customerEmailContent.html
                        );
                    }
                }

                // Send to practitioner (if customer cancelled)
                if (cancelledBy === 'CUSTOMER' && practitioner?.contact?.internal?.email) {
                    const practitionerEmailContent = await renderEmailTemplate(context.dataSources, 'booking-cancelled-practitioner', {
                        practitionerName,
                        customerName,
                        customerEmail: booking.customerEmail,
                        serviceName,
                        bookingDate,
                        bookingTime,
                        cancellationReason: reason || 'No reason provided'
                    });

                    if (practitionerEmailContent) {
                        await context.dataSources.email.sendRawHtmlEmail(
                            sender_details.from,
                            practitioner.contact.internal.email,
                            practitionerEmailContent.subject,
                            practitionerEmailContent.html
                        );
                    }
                }
            } catch (emailError) {
                console.error("Failed to send booking cancellation emails:", emailError);
            }

            return {
                code: "200",
                success: true,
                message: "Booking cancelled successfully",
                booking: {
                    ...updatedBookingData,
                    ref: { id: bookingId, partition: ["SERVICE", booking.customerId], container: "Main-Bookings" }
                }
            };
        },

    },
    Service: {
        ref: async (parent: any, _: any, _context: serverContext) => {
            return {
                 id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        },
        vendor: async (parent: any, _: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-Vendor", parent.vendorId, parent.vendorId);
        }
    },
    // MyServicesSchedule: {
    //     service: async (parent: any, _: any, {dataSources}: serverContext) => {
    //         const service = await dataSources.cosmos.get_record<service_type>("Main-Listing", parent.listingId, parent.vendorId)
    //         return service
    //     },
    //     ref: async (parent: any, _: any, _context: serverContext) => {
    //         return {
    //              id: parent.id, partition: [parent.vendorId], container: "Main-ServicesSchedules"
    //         } 
    //     }
    // },
    ServiceBooking: {
        ref: async (parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: ["SERVICE", parent.userId], container: "Main-Bookings"
            }
        },
        service: async (parent: any, _: any, {dataSources}: serverContext) => {
            const service = await dataSources.cosmos.get_record<service_type>("Main-Listing", parent.listingId, parent.vendorId)
            return service
        },
        customer: async (parent: any, _: any, context: serverContext) => {
            if (!parent.customerId) return null;
            try {
                const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", parent.customerId, parent.customerId);
                if (!user) return { id: parent.customerId, name: null, email: parent.customerEmail || null };
                return {
                    id: parent.customerId,
                    name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || null,
                    email: parent.customerEmail || user.email || null
                };
            } catch {
                return { id: parent.customerId, name: null, email: parent.customerEmail || null };
            }
        },
        payment: (parent: any) => {
            if (parent.price) {
                return { amount: parent.price.amount, currency: parent.price.currency };
            }
            if (parent.stripe?.amount) {
                return { amount: parent.stripe.amount.amount, currency: parent.stripe.amount.currency };
            }
            return null;
        },
        createdAt: (parent: any) => {
            return parent.createdDate || parent.purchaseDate || null;
        }
    },
    ServicePayment: {
        ref: async (parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: ["SERVICE", parent.userId], container: "Main-Bookings"
            }
        },
        service: async (parent: any, _: any, {dataSources}: serverContext) => {
            const service = await dataSources.cosmos.get_record<service_type>("Main-Listing", parent.listingId, parent.vendorId)
            return service
        }
    }
}

export {resolvers}