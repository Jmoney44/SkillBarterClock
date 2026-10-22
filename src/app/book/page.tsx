import { Suspense } from "react";
import { AppShell } from "../site";
import BookingForm from "./booking-form";

type BookPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function BookingPageContent({ searchParams }: BookPageProps) {
  const params = await searchParams;
  return (
    <BookingForm
      initialTeacherId={typeof params.teacher === "string" ? params.teacher : ""}
      initialSkill={typeof params.skill === "string" ? params.skill : ""}
    />
  );
}

export default function BookPage({ searchParams }: BookPageProps) {
  return (
    <Suspense fallback={<AppShell title="Book a session"><p className="lead">Loading booking details…</p></AppShell>}>
      <BookingPageContent searchParams={searchParams} />
    </Suspense>
  );
}
