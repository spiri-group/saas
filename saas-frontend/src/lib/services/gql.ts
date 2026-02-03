import axios from "axios";

export async function gql<T>(
  query: string,
  variables?: Record<string, any>,
  auth?: string
): Promise<T> {

  const endpoint = process.env.NEXT_PUBLIC_graphql_proxy || 'http://localhost:3000/api/graphql';

  try {
    const response = await axios.post(endpoint, 
      { query, variables },
      {
        headers: auth != null ? {
          'Authorization': auth,
        } : {},
      }
    );

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const { data } = response.data;
    return data as T;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to fetch data: ${error}`);
  }
}