export type Variant = {
  id: string; sku: string; label: string; price: number; compare_at: number | null;
  stock: number; low_stock_threshold: number; allow_backorder: boolean;
};
export type Product = {
  id: string; slug: string; name: string; botanical_name: string | null; tagline: string | null;
  description: string | null; category: string; concerns: string[];
  aroma: string | null; extraction: string | null; origin: string | null;
  uses: string[]; suggested_blends: string[]; safety: string | null; purity: string | null;
  color: string; images: string[]; is_bestseller: boolean; is_new: boolean;
  rating: number; review_count: number; seo_title: string | null; seo_description: string | null;
  variants: Variant[]; created_at?: string;
  combo?: Combo | null;
};
/** “Pick any N” combo: customer chooses `pick` items from `options` (variant ids); `includes` are free extras. */
export type Combo = { pick: number; options: string[]; includes?: { variant_id: string; qty: number }[]; allow_repeat?: boolean;
  /** fixed = the combo row's own price; dynamic = total of the picked items' prices */ pricing?: 'fixed' | 'dynamic' };
export type Concern = { slug: string; name: string; intro: string; color: string };
export type Category = { slug: string; name: string; intro: string };
export type CartLine = { variant_id: string; product_slug: string; name: string; label: string; price: number; qty: number; color: string; image?: string;
  /** combo lines: chosen variant ids (in slot order), their display names, and a key unique per combination */
  selections?: string[]; picks?: string[]; key?: string };
export const lineKey = (l: Pick<CartLine, 'variant_id' | 'key'>) => l.key ?? l.variant_id;
