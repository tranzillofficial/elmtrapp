import { readMaintenance } from "@/lib/maintenance";
import { SiteAvailability } from "@/components/site-availability";
import { App } from "@/components/app";
import { Landing } from "@/components/landing";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  if (path?.[0] === "admin") return <App forceAuth />;
  const status = await readMaintenance();
  if (status.enabled)
    return <SiteAvailability key="maintenance" initialStatus={status} />;
  return (
    <SiteAvailability key="online" initialStatus={status}>
      {!path?.length ? (
        <Landing />
      ) : (
        <App initialDemo={path[0] === "demo"} forceAuth={path[0] === "login"} />
      )}
    </SiteAvailability>
  );
}
