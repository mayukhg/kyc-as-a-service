import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, CheckCircle2 } from "lucide-react";

export const APIShowcase = () => {
  const apiExample = `POST /v1/kyc/risk-score
{
  "customer_id": "hash_abc123",
  "data_points": ["transaction_history", "kyc_profile"]
}

// Response
{
  "risk_score": 785,
  "eligibility": "High",
  "top_driver": "Transaction Consistency",
  "audit_hash": "0x4b7f9c2a...",
  "model_version": "v2.3.1",
  "timestamp": "2025-10-04T12:34:56Z"
}`;

  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 text-sm">
            <Code2 className="w-4 h-4 mr-2" />
            Developer-First API
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="gradient-text">Simple</span> Integration
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            RESTful API with comprehensive documentation and SDKs for major languages
          </p>
        </div>

        {/* API Example */}
        <Card className="p-8 glass-card shadow-card">
          <div className="space-y-6">
            {/* Code Block */}
            <div className="bg-background/50 rounded-lg p-6 border border-border/50 overflow-x-auto">
              <pre className="text-sm font-mono text-foreground/90">
                {apiExample}
              </pre>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-border/50">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">OAuth 2.0 Security</h4>
                  <p className="text-sm text-muted-foreground">Enterprise-grade authentication</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Real-Time Response</h4>
                  <p className="text-sm text-muted-foreground">Sub-second latency guaranteed</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Verifiable Results</h4>
                  <p className="text-sm text-muted-foreground">Blockchain-backed attestations</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
