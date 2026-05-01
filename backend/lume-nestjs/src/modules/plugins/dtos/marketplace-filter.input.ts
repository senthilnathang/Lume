export class MarketplaceFilterInput {
  search?: string;
  category?: string;
  pricing?: 'free' | 'premium';
  sortBy?: 'downloads' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}
