import { redirect } from 'next/navigation'

export default function AmazonPage() {
  redirect('/connections?platform=amazon')
}
