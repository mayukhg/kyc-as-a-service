import { Database, Cpu, Globe } from "lucide-react";
import { LayerCard } from "./LayerCard";

export const ThreeLayerArchitecture = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Three-Layer <span className="gradient-text">Architecture</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            A sophisticated hybrid model combining blockchain immutability with AI intelligence
          </p>
        </div>

        {/* Layer Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <LayerCard
            icon={Database}
            title="Layer 1"
            subtitle="Data Layer"
            description="Blockchain-based source of truth ensuring data immutability and integrity for regulatory compliance and auditability."
            features={[
              "Permissioned blockchain ledger (Hyperledger Fabric, Corda)",
              "Cryptographic hashes of KYC documents and attestations",
              "Smart contracts for data access policies",
              "Transaction summaries and verification timestamps"
            ]}
            color="primary"
            delay={0}
          />

          <LayerCard
            icon={Cpu}
            title="Layer 2"
            subtitle="Computation Layer"
            description="Off-chain AI processing with gradient boosting models for high-speed, complex risk scoring and analytics."
            features={[
              "XGBoost/LightGBM models for credit risk assessment",
              "Federated learning for privacy-preserving collaboration",
              "Oracle bridge for secure data retrieval",
              "Real-time feature calculation and model execution"
            ]}
            color="secondary"
            delay={100}
          />

          <LayerCard
            icon={Globe}
            title="Layer 3"
            subtitle="Consumption Layer"
            description="API-first microservice architecture delivering low-latency, verifiable risk scores to banking partners."
            features={[
              "Secure RESTful API with OAuth 2.0 authentication",
              "JSON response with risk scores and audit hashes",
              "Rate limiting and request routing",
              "Cryptographic verification of model provenance"
            ]}
            color="accent"
            delay={200}
          />
        </div>

        {/* Architecture Flow */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="glass-card p-8 rounded-2xl border">
            <h3 className="text-2xl font-bold mb-6 text-center">Data Flow & Verification</h3>
            <div className="grid md:grid-cols-5 gap-4 items-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto font-bold">1</div>
                <p className="text-sm">Request</p>
              </div>
              <div className="hidden md:block text-center text-muted-foreground">→</div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mx-auto font-bold">2</div>
                <p className="text-sm">AI Scoring</p>
              </div>
              <div className="hidden md:block text-center text-muted-foreground">→</div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto font-bold">3</div>
                <p className="text-sm">Verified Response</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
