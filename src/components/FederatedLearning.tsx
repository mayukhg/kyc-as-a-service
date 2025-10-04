import { Brain, Shield, Database, GitBranch, Lock, CheckCircle2, Users, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";

export const FederatedLearning = () => {
  const phases = [
    {
      number: "01",
      title: "Global Model Distribution",
      subtitle: "The Dispatch",
      icon: GitBranch,
      description: "Global GBM initialized and cryptographically hashed on blockchain for transparency",
      steps: [
        "Initialize Global Gradient Boosting Model",
        "Generate cryptographic hash of model parameters",
        "Record hash on Verifiable Ledger",
        "Securely dispatch to all participating institutions"
      ],
      color: "from-primary/20 to-primary/5"
    },
    {
      number: "02",
      title: "Local Model Training",
      subtitle: "Privacy-Preserving Step",
      icon: Lock,
      description: "Each institution trains locally on private data without exposing raw customer information",
      steps: [
        "Retrieve local proprietary customer data",
        "Train GBM copy with historical outcomes",
        "Generate model updates (gradients/deltas)",
        "Encrypt and prepare for secure transmission"
      ],
      color: "from-secondary/20 to-secondary/5"
    },
    {
      number: "03",
      title: "Global Aggregation",
      subtitle: "The Consensus",
      icon: CheckCircle2,
      description: "Model updates aggregated and new global model recorded on blockchain",
      steps: [
        "Receive encrypted model updates from clients",
        "Weighted aggregation of all updates",
        "Apply updates to create improved Global GBM",
        "Hash and record new model on Verifiable Ledger"
      ],
      color: "from-accent/20 to-accent/5"
    }
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Privacy-First",
      description: "Raw customer data never leaves institutional boundaries"
    },
    {
      icon: Users,
      title: "Collaborative Intelligence",
      description: "Multiple institutions improve the model without data sharing"
    },
    {
      icon: Database,
      title: "Cold Start Solution",
      description: "Overcome limited siloed data challenges through federation"
    },
    {
      icon: Brain,
      title: "Continuous Learning",
      description: "Model improves iteratively with each training round"
    }
  ];

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Advanced AI Training</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Federated Learning Architecture
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Collaborative model training that preserves privacy while solving the cold-start problem 
            through secure, decentralized gradient boosting
          </p>
        </div>

        {/* Training Phases */}
        <div className="space-y-8 mb-20">
          {phases.map((phase, index) => (
            <Card 
              key={phase.number}
              className="glass-card p-8 border-primary/20 hover:border-primary/40 transition-all duration-500 animate-slide-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Phase Number & Icon */}
                <div className="flex-shrink-0">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${phase.color} flex items-center justify-center mb-4`}>
                    <phase.icon className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-5xl font-bold text-primary/20">{phase.number}</div>
                </div>

                {/* Phase Content */}
                <div className="flex-grow">
                  <div className="mb-4">
                    <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                      {phase.subtitle}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-bold mt-2 mb-3">
                      {phase.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {phase.description}
                    </p>
                  </div>

                  {/* Steps */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {phase.steps.map((step, stepIndex) => (
                      <div 
                        key={stepIndex}
                        className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                          <span className="text-xs font-bold text-primary">{stepIndex + 1}</span>
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow connector (except last phase) */}
                {index < phases.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center">
                    <ArrowRight className="h-8 w-8 text-primary/30" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="space-y-8">
          <h3 className="text-3xl font-bold text-center mb-8">
            Federated Learning Benefits
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card 
                key={index}
                className="glass-card p-6 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Blockchain Role */}
        <Card className="glass-card p-8 border-primary/20 mt-12 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">Role of the Verifiable Ledger</h3>
              <p className="text-muted-foreground mb-4">
                The blockchain maintains trust among competing institutions by providing tamper-proof 
                model provenance and shared governance.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                  <h4 className="font-semibold mb-2">Model Provenance</h4>
                  <p className="text-sm text-muted-foreground">
                    Proves which GBM version was used and when it was trained
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                  <h4 className="font-semibold mb-2">Tamper-Proof Audit</h4>
                  <p className="text-sm text-muted-foreground">
                    Immutable ledger prevents model swapping or result tampering
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                  <h4 className="font-semibold mb-2">Shared Governance</h4>
                  <p className="text-sm text-muted-foreground">
                    All participants audit the model without sharing raw data
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
