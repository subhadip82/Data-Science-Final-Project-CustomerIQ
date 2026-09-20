import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <SignUp routing="path" path="/sign-up" signInUrl="/login" />
    </div>
  );
}
