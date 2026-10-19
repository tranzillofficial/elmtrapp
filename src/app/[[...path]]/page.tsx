import { App } from "@/components/app";
import { Landing } from "@/components/landing";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  if (!path?.length) return <Landing />;
  return (
    <App
      initialDemo={path[0] === "demo"}
      forceAuth={path[0] === "login" || path[0] === "admin"}
    />
  );
}
