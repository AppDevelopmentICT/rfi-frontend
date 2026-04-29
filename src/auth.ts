import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials.email as string
        const password = credentials.password as string

        // Mock authorization — replace with real backend check later
        if (email === "admin@company.com" && password === "password") {
          return {
            id: "1",
            name: "Admin User",
            email: "admin@company.com",
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
})
