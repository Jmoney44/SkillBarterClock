import { Suspense } from "react";
import ForgotPasswordForm from "./forgot-password-form";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function ForgotPasswordContent({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  return <ForgotPasswordForm linkExpired={params.expired === "1"} />;
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  return (
    <Suspense fallback={<ForgotPasswordForm linkExpired={false} />}>
      <ForgotPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}
