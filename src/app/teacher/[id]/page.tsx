import { Suspense } from "react";
import { AppShell } from "../../site";
import TeacherProfile from "./teacher-profile";

async function TeacherDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeacherProfile teacherId={id} />;
}

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<AppShell title="Teacher profile"><p className="lead">Loading teacher profile…</p></AppShell>}>
      <TeacherDetailContent params={params} />
    </Suspense>
  );
}
