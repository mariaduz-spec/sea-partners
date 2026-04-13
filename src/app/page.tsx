import { redirect } from 'next/navigation'

// Middleware ja roteia: se logado → /dashboard, senao → /login.
// Essa rota so existe como ponto de entrada; a navegacao real esta no middleware.
export default function Home() {
  redirect('/dashboard')
}
