import { supabase } from './supabase'

export interface Restaurant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  hero_images: string[] | null
  address: string | null
  google_maps_url: string | null
  phone: string | null
  email: string | null
  hours: any
  working_hours: any[] | null
  primary_color: string
  secondary_color: string
  meta_description: string | null
  instagram_username: string | null
  facebook_url: string | null
  status: string | null
  subscription_plan: string | null
  valid_until: string | null
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    console.error('Error fetching restaurant:', error)
    return null
  }

  return data as Restaurant
}

export async function getUserRestaurant(userId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, restaurante:restaurants(*)')
    .eq('id', userId)
    .single()

  if (error || !data || !data.restaurante) {
    console.error('Error fetching user restaurant:', error)
    return null
  }

  return data.restaurante as Restaurant
}
