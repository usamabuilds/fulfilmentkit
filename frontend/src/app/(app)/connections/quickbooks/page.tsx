import { redirect } from 'next/navigation'

export default function QuickBooksPage() {
  redirect('/connections?platform=quickbooks')
}
