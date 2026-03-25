import { apiGetList } from '@/lib/api/client'

export interface Location {
  id: string
  code: string
  name: string
  createdAt: string
}

export const locationsApi = {
  list: () => apiGetList<Location>('/locations'),
}
