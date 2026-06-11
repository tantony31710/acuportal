// Conceptual TanStack Router Authenticated Route Guard
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // 1. If user isn't logged in, redirect to /login
    if (!context.auth.user) {
      throw redirect({ to: '/login' })
    }
    
    // 2. Fetch profile from our profiles table to determine role
    const profile = context.auth.profile
    
    // 3. Route specific authorization checks
    return { profile }
  },
})