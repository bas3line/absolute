import { Blackbox } from "@/components/sections/Blackbox";
import { Canary } from "@/components/sections/Canary";
import { Closing } from "@/components/sections/Closing";
import { Faq } from "@/components/sections/Faq";
import { Features } from "@/components/sections/Features";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Ledger } from "@/components/sections/Ledger";
import { Nav } from "@/components/sections/Nav";
import { Pricing } from "@/components/sections/Pricing";
import { Regions } from "@/components/sections/Regions";
import { Signup } from "@/components/sections/Signup";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Blackbox />
        <Signup />
        <Ledger />
        <Features />
        <Regions />
        <Pricing />
        <Canary />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
