export type Profile = {
  id: string
  display_name: string
}

export type Whisky = {
  id: string
  brand: string
  name: string
  age_years: number | null
  vintage_year: number | null
  category: string | null
  cost: number | null
}

export type ReviewListItem = {
  id: string
  review_date: string
  rating: number
  notes: string | null
  profile_id: string | null
  whisky_id: string
  location: string | null
  profile_name: string | null
  whisky_brand: string
  whisky_name: string
  whisky_category: string | null
}

export type WhiskyStat = {
  id: string
  brand: string
  name: string
  category: string | null
  review_count: number
  avg_rating: number | null
}
