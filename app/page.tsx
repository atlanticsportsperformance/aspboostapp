import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect root to dashboard for now
  // Later we can make this a proper landing page
  redirect('/dashboard');
}