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
        eyebrow="Restricted"
        title="Moderation"
        lede={`Moderation for ${SITE_TITLE}. Accounts are issued by hand, and there is no sign-up.`}
      />

      <section className="shell py-[clamp(2.5rem,1.8rem+4vw,5rem)]">
        {isAuthConfigured ? (
          <LoginForm />
        ) : (
          <p className="glass mx-auto max-w-[26rem] rounded-[var(--radius-xl)] p-6 text-small text-muted">
            No Appwrite credentials in this environment, so there is nothing to
            sign in to.
          </p>
        )}
      </section>
    </>
  );
}
