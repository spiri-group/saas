import { useState, useEffect } from 'react';

const useReverseGeocoding = () => {
  const [countryCode, setCountryCode] = useState(null);

  useEffect(() => {
    const geo = navigator.geolocation;

    if (!geo) {
      // If geolocation is not supported, return null
      setCountryCode(null);
      return;
    }

    const successHandler = async ({ coords }) => {
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_KEY}`);
        const data = await response.json();
        const address_components = data.results[0].address_components;
        const country = address_components.find((component) => component.types.includes('country'));

        setCountryCode(country.short_name);
      } catch (e) {
        console.error(e);
        setCountryCode(null);
      }
    };

    geo.getCurrentPosition(successHandler, () => {
      // If there was an error while getting the user's location, return null
      setCountryCode(null);
    });
  }, []);

  return countryCode;
};

export default useReverseGeocoding;