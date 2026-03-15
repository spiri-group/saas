'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { JourneyProgress } from '../../journeys/_hooks/UseMyJourneys';

// Extended journey type that includes tracks with titles and prompts
interface JourneyWithTracks extends JourneyProgress {
  journey?: JourneyProgress['journey'] & {
    tracks?: {
      id: string;
      trackNumber: number;
      title: string;
      integrationPrompts?: string[];
    }[];
  };
}

export const useMyJourneysWithTracks = (userId: string) => {
  return useQuery({
    queryKey: ['my-journeys-with-tracks', userId],
    queryFn: async () => {
      const response = await gql<{
        myJourneys: JourneyWithTracks[];
      }>(`
        query MyJourneysWithTracks($userId: ID!) {
          myJourneys(userId: $userId) {
            id
            userId
            journeyId
            vendorId
            trackProgress {
              trackId
              completed
              lastPositionSeconds
              completedDate
              reflection
            }
            journey {
              id
              name
              journeyStructure
              vendor {
                id
                name
                slug
              }
              tracks {
                id
                trackNumber
                title
                integrationPrompts
              }
            }
          }
        }
      `, { userId });
      return response.myJourneys;
    },
    enabled: !!userId,
  });
};
