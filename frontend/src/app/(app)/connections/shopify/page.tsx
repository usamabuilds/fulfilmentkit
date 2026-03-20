import { redirect } from 'next/navigation'

export default function ShopifyPage() {
  redirect('/connections?platform=shopify')
}
