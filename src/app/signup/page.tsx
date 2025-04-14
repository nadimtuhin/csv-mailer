import SignupForm from '@/components/SignupForm';
// Removed unused Navbar import

export default function SignupPage() {
  return (
    <div>
      {/* You might want a simpler Navbar or none on auth pages */}
      {/* <Navbar /> */}
      <div className="container mx-auto px-4 py-12">
        <SignupForm />
      </div>
    </div>
  );
}
