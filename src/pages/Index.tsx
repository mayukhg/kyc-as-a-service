import { Hero } from "@/components/Hero";
import { ThreeLayerArchitecture } from "@/components/ThreeLayerArchitecture";
import { FederatedLearning } from "@/components/FederatedLearning";
import { APIShowcase } from "@/components/APIShowcase";
import { TrustSection } from "@/components/TrustSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <ThreeLayerArchitecture />
      <FederatedLearning />
      <APIShowcase />
      <TrustSection />
    </div>
  );
};

export default Index;
