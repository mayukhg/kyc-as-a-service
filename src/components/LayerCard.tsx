import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface LayerCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  color: "primary" | "secondary" | "accent";
  delay?: number;
}

export const LayerCard = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  description, 
  features, 
  color,
  delay = 0 
}: LayerCardProps) => {
  const colorClasses = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    secondary: "from-secondary/20 to-secondary/5 border-secondary/30",
    accent: "from-accent/20 to-accent/5 border-accent/30",
  };

  const iconColorClasses = {
    primary: "text-primary bg-primary/10",
    secondary: "text-secondary bg-secondary/10",
    accent: "text-accent bg-accent/10",
  };

  return (
    <Card 
      className={`p-8 glass-card bg-gradient-to-br ${colorClasses[color]} shadow-card hover:shadow-glow transition-all duration-500 animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="space-y-6">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl ${iconColorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-7 h-7" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {subtitle}
          </p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Features */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`w-1.5 h-1.5 rounded-full mt-2 ${iconColorClasses[color].split(' ')[0]}`} />
              <span className="text-sm text-foreground/80">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
