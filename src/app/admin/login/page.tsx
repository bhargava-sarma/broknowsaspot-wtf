import { PageHeader } from "@/components/layout/page-header";
import { LoginForm } from "@/components/admin/login-form";
import { isAuthConfigured } from "@/lib/supabase/server-client";

/**
 * There is no sign-up link, and there never will be one. Accounts are
 * created in the Supabase dashboard and granted moderation rights by
 * inserting a row in `public.admins` — see supabase/README.md.
 */
export default function AdminLoginPage() {
  return (
    <>
      <PageHeader
        eyebrow="restricted"
        title="admin"
        lede="moderation for broknowsaspot.wtf. accounts are issued by hand — there is no sign-up."
      />

      <section className="shell py-[clamp(2.5rem,1.8rem+4vw,5rem)]">
        {isAuthConfigured ? (
          <LoginForm />
        ) : (
          <p className="max-w-[46ch] font-mono text-micro text-faint lowercase">
            no supabase credentials in this environment, so there is nothing to
            sign in to.
          </p>
        )}
      </section>
    </>
  );
}
