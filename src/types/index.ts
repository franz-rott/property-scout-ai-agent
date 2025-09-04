// src/types/index.ts
import { z } from 'zod';

// Schema for a raw property listing fetched from the ImmoScout24 API
export const PropertyListingSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    postalCode: z.string(),
    state: z.string(), // e.g., 'Nordrhein-Westfalen'
  }),
  plotArea: z.number().positive(), // in m²
  price: z.number().positive(),
  pricePerSqm: z.number().positive(),
  plotType: z.enum(['building', 'agricultural', 'commercial']),
  url: z.string().url(),
  retrievedAt: z.string().datetime(),
  geoCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});
export type PropertyListing = z.infer<typeof PropertyListingSchema>;

// Schemas for individual agent evaluations
const BaseEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  details: z.record(z.any()),
});

export const EcoImpactEvaluationSchema = BaseEvaluationSchema.extend({
  details: z.object({
    landCover: z.string(),
    soilSealing: z.string(),
    biodiversityPotential: z.string(),
    climateResilience: z.string(),
  }),
});
export type EcoImpactEvaluation = z.infer<typeof EcoImpactEvaluationSchema>;

export const LegalEvaluationSchema = BaseEvaluationSchema.extend({
  details: z.object({
    zoningCompliance: z.string(),
    protectedAreaStatus: z.string(),
    potentialRestrictions: z.array(z.string()),
  }),
});
export type LegalEvaluation = z.infer<typeof LegalEvaluationSchema>;

export const FinanceEvaluationSchema = BaseEvaluationSchema.extend({
  details: z.object({
    marketValueComparison: z.string(),
    potentialRoi: z.string(),
    costBreakdown: z.record(z.number()),
  }),
});
export type FinanceEvaluation = z.infer<typeof FinanceEvaluationSchema>;

// Recommendation enum for the final output
export const RecommendationEnum = z.enum([
  'HIGHLY_RECOMMENDED',
  'RECOMMENDED',
  'NEUTRAL',
  'NOT_RECOMMENDED',
]);
export type Recommendation = z.infer<typeof RecommendationEnum>;

// Final aggregated output schema from the Orchestrator
export const AggregatedEvaluationSchema = z.object({
  listingId: z.string().uuid(),
  propertyDetails: PropertyListingSchema,
  evaluations: z.object({
    ecoImpact: EcoImpactEvaluationSchema,
    legal: LegalEvaluationSchema,
    finance: FinanceEvaluationSchema,
  }),
  overallScore: z.number().min(0).max(100),
  recommendation: RecommendationEnum,
  executiveSummary: z.string(),
});
export type AggregatedEvaluation = z.infer<typeof AggregatedEvaluationSchema>;