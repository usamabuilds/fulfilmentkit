import { redirect } from 'next/navigation'

export default function OrdersCancelledPage() {
  redirect('/orders?status=CANCELLED')
}
