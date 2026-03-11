import { redirect } from 'next/navigation'

export default function SagePage() {
  redirect('/connections?platform=SAGE')
}
