import { supabase } from '@/lib/supabase'
import type { Profile, ReviewListItem, Whisky, WhiskyStat } from '@/lib/types'

export async function getRecentReviews(limit = 25): Promise<ReviewListItem[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      review_date,
      rating,
      notes,
      profile_id,
      whisky_id,
      profiles(display_name),
      whiskies(brand, name, category),
      tasting_sessions(location)
    `)
    .order('review_date', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    review_date: row.review_date,
    rating: Number(row.rating),
    notes: row.notes,
    profile_id: row.profile_id,
    whisky_id: row.whisky_id,
    location: row.tasting_sessions?.location ?? null,
    profile_name: row.profiles?.display_name ?? null,
    whisky_brand: row.whiskies?.brand ?? 'Unknown',
    whisky_name: row.whiskies?.name ?? 'Bottle',
    whisky_category: row.whiskies?.category ?? null,
  }))
}

export async function getWhiskies(): Promise<WhiskyStat[]> {
  const { data, error } = await supabase
    .from('whisky_stats')
    .select('*')
    .order('avg_rating', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    review_count: Number(row.review_count ?? 0),
    avg_rating: row.avg_rating == null ? null : Number(row.avg_rating),
  }))
}

export async function getWhiskyById(id: string): Promise<Whisky | null> {
  const { data, error } = await supabase
    .from('whiskies')
    .select('id, brand, name, age_years, vintage_year, category, cost')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getReviewsForWhisky(id: string): Promise<ReviewListItem[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      review_date,
      rating,
      notes,
      profile_id,
      whisky_id,
      profiles(display_name),
      whiskies(brand, name, category),
      tasting_sessions(location)
    `)
    .eq('whisky_id', id)
    .order('review_date', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    review_date: row.review_date,
    rating: Number(row.rating),
    notes: row.notes,
    profile_id: row.profile_id,
    whisky_id: row.whisky_id,
    location: row.tasting_sessions?.location ?? null,
    profile_name: row.profiles?.display_name ?? null,
    whisky_brand: row.whiskies?.brand ?? 'Unknown',
    whisky_name: row.whiskies?.name ?? 'Bottle',
    whisky_category: row.whiskies?.category ?? null,
  }))
}

export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  if (error) throw error
  return data ?? []
}

export async function getWhiskyOptions(): Promise<Pick<Whisky, 'id' | 'brand' | 'name'>[]> {
  const { data, error } = await supabase
    .from('whiskies')
    .select('id, brand, name')
    .order('brand')

  if (error) throw error
  return data ?? []
}

export async function getDashboardStats() {
  const [reviews, whiskies, leaderboard] = await Promise.all([
    getRecentReviews(200),
    getWhiskies(),
    getWhiskies(),
  ])

  return {
    totalReviews: reviews.length,
    totalWhiskies: whiskies.length,
    topBottle: leaderboard.find((w) => w.review_count >= 2) ?? leaderboard[0] ?? null,
  }
}
