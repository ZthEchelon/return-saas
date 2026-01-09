import { currentUser } from "@clerk/nextjs/server";

type MinimalUser = {
  id: string;
  email: string | null;
  name: string | null;
};

// Clerk is the source of truth for user data; we just return the essentials.
export async function ensureUser(): Promise<MinimalUser | null> {
  const cu = await currentUser();
  if (!cu) return null;

  const email = cu.emailAddresses?.[0]?.emailAddress ?? null;
  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() || null;

  return { id: cu.id, email, name };
}
