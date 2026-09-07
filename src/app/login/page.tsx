import { Suspense } from 'react';
import { Login } from '@/screens/login';
export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
