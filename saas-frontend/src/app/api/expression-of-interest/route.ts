import { NextResponse } from 'next/server';

const azure_function_uri =
  process.env.server_endpoint != undefined &&
  !process.env.server_endpoint.includes('localhost')
    ? `${process.env.server_endpoint}/expression-of-interest?code=${process.env.server_endpoint_code}`
    : "http://127.0.0.1:7071/api/expression-of-interest";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log('Expression of Interest API - Endpoint:', azure_function_uri);
    console.log('Expression of Interest API - Body:', body);

    const response = await fetch(azure_function_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-cache',
    });

    console.log('Expression of Interest API - Response status:', response.status);
    console.log('Expression of Interest API - Response headers:', Object.fromEntries(response.headers.entries()));

    // Check if response has content
    const responseText = await response.text();
    console.log('Expression of Interest API - Response text:', responseText);

    if (!responseText) {
      console.error('Empty response from Azure Function');
      return NextResponse.json(
        { error: 'Azure Function returned empty response' },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from Azure Function', details: responseText },
        { status: 500 }
      );
    }

    console.log('Expression of Interest API - Response data:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error submitting expression of interest:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
