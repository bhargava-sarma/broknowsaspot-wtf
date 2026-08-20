import { PageHeader } from "@/components/layout/page-header";
import { LoginForm } from "@/components/admin/login-form";
import { SITE_TITLE } from "@/lib/site";
import { isAuthConfigured } from "@/lib/appwrite/auth";

/**
 * There is no sign-up link, and there never will be one. Accounts are
 * created with `npm run appwrite:admin`, which both makes the user and
 * puts them in the `admins` team — see the README's moderator section.
 */
export default function AdminLoginPage() {
  return (
    <>
      <PageHeader
        eyebrow="restricted"
        title="admin"
        lede={`moderation for ${SITE_TITLE}. accounts are issued by hand — there is no sign-up.`}
      />

      <section className="shell py-[clamp(2.5rem,1.8rem+4vw,5rem)]">
        {isAuthConfigured ? (
          <LoginForm />
        ) : (
          <p className="max-w-[46ch] font-mono text-micro text-faint lowercase">
            no appwrite credentials in this environment, so there is nothing to
            sign in to.
          </p>
        )}
      </section>
    </>
  );
}
