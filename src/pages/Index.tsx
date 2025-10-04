import { Hero } from "@/components/Hero";
import { ThreeLayerArchitecture } from "@/components/ThreeLayerArchitecture";
import { APIShowcase } from "@/components/APIShowcase";
import { TrustSection } from "@/components/TrustSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <ThreeLayerArchitecture />
      <APIShowcase />
      <TrustSection />
    </div>
  );
};

export default Index;
