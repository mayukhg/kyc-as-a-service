import { Card } from "@/components/ui/card";
import { Shield, Lock, Zap, CheckCircle, Award, Server } from "lucide-react";

export const TrustSection = () => {
  const features = [
    {
      icon: Shield,
      title: "Regulatory Compliant",
      description: "Full GDPR compliance with right-to-erasure support through hybrid architecture"
    },
    {
      icon: Lock,
      title: "Bank-Grade Security",
      description: "Multi-layer encryption and permissioned blockchain access control"
    },
    {
      icon: Zap,
      title: "High Performance",
      description: "Sub-second scoring with 99.99% uptime SLA guarantee"
    },
    {
      icon: CheckCircle,
      title: "Audit Trail",
      description: "Immutable records of every score generation for complete transparency"
    },
    {
      icon: Award,
      title: "Proven Accuracy",
      description: "AI models trained on millions of transactions with continuous learning"
    },
    {
      icon: Server,
      title: "Scalable Infrastructure",
      description: "Microservice architecture designed for enterprise-scale operations"
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Built for <span className="gradient-text">Trust & Scale</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade infrastructure trusted by leading financial institutions
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 glass-card shadow-card hover:shadow-glow transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-8 mt-16 text-center">
          <div className="space-y-2">
            <div className="text-4xl font-bold gradient-text">99.99%</div>
            <div className="text-muted-foreground">Uptime SLA</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-bold gradient-text">&lt;500ms</div>
            <div className="text-muted-foreground">Avg Response Time</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-bold gradient-text">10M+</div>
            <div className="text-muted-foreground">Scores Generated</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-bold gradient-text">100%</div>
            <div className="text-muted-foreground">Audit Traceability</div>
          </div>
        </div>
      </div>
    </section>
  );
};
