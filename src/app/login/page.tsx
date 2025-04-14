import LoginForm from '@/components/LoginForm';
// Removed unused Navbar import

export default function LoginPage() {
  return (
    <div>
      {/* You might want a simpler Navbar or none on auth pages */}
      {/* <Navbar /> */}
      <div className="container mx-auto px-4 py-12">
        <LoginForm />
      </div>
    </div>
  );
}
