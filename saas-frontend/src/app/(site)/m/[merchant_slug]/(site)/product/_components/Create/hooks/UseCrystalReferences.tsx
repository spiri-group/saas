"use client";

import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export type CrystalReference = {
  id: string;
  name: string;
  alternateNames: string[];
  description: string;
  colors: string[];
  commonForms: string[];
  chakras?: string[];
  elements?: string[];
  zodiacSigns?: string[];
  thumbnail?: string;
};

export const useSearchCrystals = (query: string, limit = 20) => {
  return useQuery({
    queryKey: ["search-crystals", query, limit],
    queryFn: async () => {
      const response = await gql<{
        searchCrystals: CrystalReference[];
      }>(
        `
        query SearchCrystals($query: String!, $limit: Int) {
          searchCrystals(query: $query, limit: $limit) {
            id
            name
            alternateNames
            description
            colors
            commonForms
            chakras
            elements
            zodiacSigns
            thumbnail
          }
        }
      `,
        { query, limit }
      );
      return response.searchCrystals;
    },
    enabled: query.length >= 2,
  });
};

export const useCrystalReference = (id: string) => {
  return useQuery({
    queryKey: ["crystal-reference", id],
    queryFn: async () => {
      const response = await gql<{
        crystalReference: CrystalReference | null;
      }>(
        `
        query GetCrystalReference($id: ID!) {
          crystalReference(id: $id) {
            id
            name
            alternateNames
            description
            colors
            commonForms
            chakras
            elements
            zodiacSigns
            thumbnail
          }
        }
      `,
        { id }
      );
      return response.crystalReference;
    },
    enabled: !!id,
  });
};
