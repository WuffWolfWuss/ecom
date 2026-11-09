import Footer from '@/components/ui/shared/footer/footer';
import Header from '@/components/ui/shared/header';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 wapper">{children}</main>
      <Footer />
    </div>
  );
}
