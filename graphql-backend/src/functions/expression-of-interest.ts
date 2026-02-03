import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

interface ExpressionOfInterestData {
  userType: "merchant" | "customer";
  name: string;
  email: string;
  referralSource: "socials" | "google" | "friend" | "mind-body-spirit-festival";
}

export async function expressionOfInterest(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`${context.invocationId} - Expression of Interest submission`);

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle OPTIONS request for CORS preflight
  if (request.method === "OPTIONS") {
    return {
      status: 200,
      headers: corsHeaders,
    };
  }

  try {
    // Parse request body
    const data = (await request.json()) as ExpressionOfInterestData;

    // Validate required fields
    if (!data.userType || !data.name || !data.email || !data.referralSource) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing required fields: userType, name, email, and referralSource are required.",
        }),
      };
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(data.email)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Invalid email address.",
        }),
      };
    }

    // Validate userType
    if (data.userType !== "merchant" && data.userType !== "customer") {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "userType must be either 'merchant' or 'customer'.",
        }),
      };
    }

    // Validate referralSource
    if (data.referralSource !== "socials" && data.referralSource !== "google" && data.referralSource !== "friend" && data.referralSource !== "mind-body-spirit-festival") {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "referralSource must be either 'socials', 'google', 'friend', or 'mind-body-spirit-festival'.",
        }),
      };
    }

    context.log(
      `Processing expression of interest: ${data.userType} - ${data.email} - ${data.referralSource}`
    );

    // TODO: Expression of interest data is validated but not stored anywhere
    // Kit email marketing integration was removed (subscription inactive)
    // Consider storing in Cosmos DB or integrating with a new email service

    return {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Expression of interest submitted successfully.",
      }),
    };
  } catch (error) {
    context.error("Error processing expression of interest:", error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "An error occurred while processing your request.",
      }),
    };
  }
}

app.http("expression-of-interest", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: expressionOfInterest,
});
