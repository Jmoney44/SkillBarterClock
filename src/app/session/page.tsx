import { Suspense } from "react";
import { AppShell } from "../site";
import SessionRoom from "./session-room";

type SessionPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function SessionPageContent({ searchParams }: SessionPageProps) {
  const params = await searchParams;
  return <SessionRoom sessionId={typeof params.id === "string" ? params.id : ""} />;
}

export default function SessionPage({ searchParams }: SessionPageProps) {
  return (
    <Suspense fallback={<AppShell title="Session room"><p className="lead">Loading session…</p></AppShell>}>
      <SessionPageContent searchParams={searchParams} />
    </Suspense>
  );
}
