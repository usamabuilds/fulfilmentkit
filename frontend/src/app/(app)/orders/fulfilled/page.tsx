import { redirect } from 'next/navigation'

export default function OrdersFulfilledPage() {
  redirect('/orders?status=FULFILLED')
}
