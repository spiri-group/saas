import { isNullOrUndefined, isNullOrWhitespace } from '@/lib/functions';
import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

const extract_component = (address_components: any[], type: string, field: 'shortText' | 'longText' = 'shortText') => {
  const component = address_components.find((ac: any) => ac.types && ac.types.includes(type));
  if (isNullOrUndefined(component)) {
    return '';
  } else {
    return component[field] as string;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (query === null) {
    return new NextResponse(JSON.stringify({ ok: false, error: 'No query found in request' }), { status: 400 });
  }

  if (isNullOrWhitespace(query)) {
    return new NextResponse(JSON.stringify({ places: []}), { status: 200 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
  const apiUrl = `https://places.googleapis.com/v1/places:searchText`;

  const headers = {
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": "places.name,places.id,places.formattedAddress,places.location,places.address_components"
  }

  try {
    const response = await axios.post(apiUrl, { textQuery: query }, { headers });

    let {places} = response.data;
    if (isNullOrUndefined(places)) {
      places = [];
    }

    // we need to enrich and pluck out the country
    // then delete the address_components
    places.forEach((place: any) => {
      const {addressComponents} = place;
      
      // we need to convert address components into what Stripe expects
      // "address": {
      //   "city": "Seattle",
      //   "country": "US",
      //   "line1": "920 5th Ave",
      //   "line2": null,
      //   "postal_code": "98104",
      //   "state": "WA"
      // },

      if (!isNullOrUndefined(addressComponents)) {
        const components = {
          city: extract_component(addressComponents, 'locality'),
          country: extract_component(addressComponents, 'country'),
          line1: extract_component(addressComponents, 'street_number') + ' ' + extract_component(addressComponents, 'route'),
          postal_code: extract_component(addressComponents, 'postal_code'),
          state: extract_component(addressComponents, 'administrative_area_level_1')
        }

        place.components = components;
     }

      if (!isNullOrUndefined(addressComponents)) {
        delete place.addressComponents;
      }

    });

    return new NextResponse(JSON.stringify({ places }), { status: 200 });
  } catch (error) {
    console.error('Error fetching data from Google Maps API:', error);
  }
};