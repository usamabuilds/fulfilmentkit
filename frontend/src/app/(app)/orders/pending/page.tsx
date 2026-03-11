import { redirect } from 'next/navigation'

export default function OrdersPendingPage() {
  redirect('/orders?status=PENDING')
}
