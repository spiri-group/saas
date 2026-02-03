// ============================================
// Mediumship Hooks - Consolidated Exports
// ============================================

// Synchronicities
export { default as useSynchronicities } from './useSynchronicities';
export {
  useRecentSynchronicities,
  useSynchronicity,
  useCreateSynchronicity,
  useUpdateSynchronicity,
  useDeleteSynchronicity,
} from './useSynchronicities';
export type {
  Synchronicity,
  SymbolTag,
  CreateSynchronicityInput,
  UpdateSynchronicityInput,
} from './useSynchronicities';

// Spirit Messages
export { default as useSpiritMessages } from './useSpiritMessages';
export {
  useRecentSpiritMessages,
  useSpiritMessage,
  useCreateSpiritMessage,
  useUpdateSpiritMessage,
  useDeleteSpiritMessage,
} from './useSpiritMessages';
export type {
  SpiritMessage,
  SpiritSource,
  ReceptionMethod,
  CreateSpiritMessageInput,
  UpdateSpiritMessageInput,
} from './useSpiritMessages';

// Personal Symbols
export { default as usePersonalSymbols } from './usePersonalSymbols';
export {
  usePersonalSymbol,
  usePersonalSymbolByName,
  useCreatePersonalSymbol,
  useUpdatePersonalSymbol,
  useDeletePersonalSymbol,
} from './usePersonalSymbols';
export type {
  PersonalSymbol,
  ContextualMeaning,
  SymbolExample,
  MeaningEvolution,
  CreatePersonalSymbolInput,
  UpdatePersonalSymbolInput,
} from './usePersonalSymbols';

// Loved Ones
export { default as useLovedOnes } from './useLovedOnes';
export {
  useLovedOne,
  useCreateLovedOne,
  useUpdateLovedOne,
  useDeleteLovedOne,
} from './useLovedOnes';
export type {
  LovedOneInSpirit,
  SignExplanation,
  MessageHistoryItem,
  ImportantDate,
  CreateLovedOneInput,
  UpdateLovedOneInput,
} from './useLovedOnes';

// Development Exercises
export { default as useDevelopmentExercises } from './useDevelopmentExercises';
export {
  useRecentDevelopmentExercises,
  useDevelopmentExercise,
  useCreateDevelopmentExercise,
  useUpdateDevelopmentExercise,
  useDeleteDevelopmentExercise,
} from './useDevelopmentExercises';
export type {
  DevelopmentExercise,
  ExerciseType,
  ExerciseDifficulty,
  CreateDevelopmentExerciseInput,
  UpdateDevelopmentExerciseInput,
} from './useDevelopmentExercises';

// Reading Reflections
export { default as useReadingReflections } from './useReadingReflections';
export {
  useRecentReadingReflections,
  useReadingReflection,
  useCreateReadingReflection,
  useUpdateReadingReflection,
  useDeleteReadingReflection,
} from './useReadingReflections';
export type {
  ReadingReflection,
  CreateReadingReflectionInput,
  UpdateReadingReflectionInput,
} from './useReadingReflections';

// Stats
export { default as useMediumshipStats } from './useMediumshipStats';
export type { MediumshipStats } from './useMediumshipStats';
