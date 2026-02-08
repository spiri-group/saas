// Resolver map.
import fs from "fs";
import {resolvers as SharedResolvers} from "./0_shared"
import {resolvers as VendorResolvers} from "./vendor";
import {resolvers as ListingResolvers} from "./listing";
import EventAndTourResolvers from "./eventandtour";
import {resolvers as UserResolvers} from "./user";
import {resolvers as ProductResolvers} from "./product";
import {resolvers as ChoicesResolvers} from "./choices";
import {resolvers as SocialPostResolvers} from "./social";
import {resolvers as CommentResolvers} from "./comments";
import {resolvers as QuestionResolvers} from "./question";
import {resolvers as ReportResolvers} from "./report";
import {resolvers as ObjectResolvers} from "./object";
import {resolvers as CaseResolvers} from "./case";
import {resolvers as OrderResolvers} from "./order";
import {resolvers as WishlistResolvers} from "./wishlist";
import {resolvers as MessageResolvers} from "./messages";
import {resolvers as ServiceResolvers} from "./service";
import {resolvers as ShoppingCartResolvers} from "./shoppingcart";
import {resolvers as LogisticsResolvers} from "./logistics";
import {resolvers as InventoryResolvers} from "./inventory";
import {resolvers as MerchantGalleryResolvers} from "./gallery"
import {resolvers as PaymentResolvers} from "./payment"
import {resolvers as FeesResolvers} from "./fees"
import {resolvers as EmailResolvers} from "./email"
import {resolvers as FollowResolvers} from "./follow"
import {resolvers as PersonalSpaceResolvers} from "./personal-space"
import {readingRequestResolvers as ReadingRequestResolvers} from "./reading-request"
import {resolvers as CrystalReferenceResolvers} from "./crystal-reference"
import {resolvers as PractitionerInsightsResolvers} from "./practitioner-insights"
import {resolvers as FeaturingResolvers} from "./featuring"
import {resolvers as PlatformAlertResolvers} from "./platform-alert"
import {resolvers as AccountsResolvers} from "./accounts"
import {resolvers as AnalyticsResolvers} from "./analytics"

import {mergeDeep, getAllFilesWithExtension} from "../utils/functions"

import { typeDefs as ScalarTypeDefs } from "graphql-scalars";
import path from "path";

const resolvers = mergeDeep(
  {},
  SharedResolvers,
  VendorResolvers,
  ListingResolvers,
  EventAndTourResolvers,
  UserResolvers,
  ProductResolvers,
  ChoicesResolvers,
  SocialPostResolvers,
  CommentResolvers,
  QuestionResolvers,
  ReportResolvers,
  ObjectResolvers,
  CaseResolvers,
  OrderResolvers,
  LogisticsResolvers,
  WishlistResolvers,
  MessageResolvers,
  ServiceResolvers,
  ShoppingCartResolvers,
  InventoryResolvers,
  MerchantGalleryResolvers,
  PaymentResolvers,
  FeesResolvers,
  EmailResolvers,
  FollowResolvers,
  PersonalSpaceResolvers,
  ReadingRequestResolvers,
  CrystalReferenceResolvers,
  PractitionerInsightsResolvers,
  FeaturingResolvers,
  PlatformAlertResolvers,
  AccountsResolvers,
  AnalyticsResolvers
)

let typeDefs: string[] = ScalarTypeDefs
const searchPath = path.join(__dirname, './')
const typeDefFiles = getAllFilesWithExtension(searchPath, ".graphql")
for (var typeDefFile of typeDefFiles) {
  const typeDef = fs.readFileSync(typeDefFile, "utf-8")
  typeDefs = [...typeDefs, typeDef]
}

export { typeDefs, resolvers };