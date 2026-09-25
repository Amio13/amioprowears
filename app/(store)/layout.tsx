import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartHydrator } from "@/components/store/CartHydrator";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { LayoutChatButton } from "@/components/store/LayoutChatButton";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <LayoutChatButton />
      <CartHydrator />
      <CartDrawer />
    </>
  );
}
