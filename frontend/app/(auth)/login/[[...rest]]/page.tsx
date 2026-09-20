import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <SignIn routing="path" path="/login" signUpUrl="/sign-up" />
    </div>
  );
}
