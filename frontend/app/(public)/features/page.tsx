import Link from "next/link";
import { Activity, Users, TrendingUp, Lightbulb, Star, BarChart2, CheckCircle2, Shield, Zap, ArrowRight } from "lucide-react";

export default function FeaturesPage() {
  const featureList = [
    {
      icon: Activity,
      title: "Automated RFM Calculation",
      description: "Scores customer Recency, Frequency, and Monetary metrics automatically on every CSV transaction upload without manual spreadsheets.",
      details: ["1-5 Quintile Ranking", "Custom Weight Adjustments", "Historical RFM Drift Detection", "Automatic Churn Thresholds"]
    },
    {
      icon: Users,
      title: "K-Means ML Segmentation",
      description: "Advanced unsupervised machine learning groups your customer base into VIP, Loyal, Potential, and At-Risk cohorts dynamically.",
      details: ["PCA 2D Cluster Visualisation", "Elbow & Silhouette Optimisation", "Outlier & Anomaly Isolation", "Interpretable Persona Mapping"]
    },
    {
      icon: TrendingUp,
      title: "Sales & Revenue Performance",
      description: "Deep dive into product-level volume, order value distribution, geographic heatmaps, and monthly annualized run-rates.",
      details: ["Country-level Breakdown", "Top 10 High-Yield SKUs", "Average Order Value (AOV) Metrics", "Month-over-Month Velocity"]
    },
    {
      icon: Lightbulb,
      title: "Predictive Business Insights",
      description: "Heuristic and rule-based recommendation engine highlights critical business conditions, revenue concentration, and retention warnings.",
      details: ["VIP Revenue Exposure Index", "Churn Risk Early Warnings", "Repeat Purchase Trajectory", "AOV Skew Analysis"]
    },
    {
      icon: Star,
      title: "Segment Action Playbooks",
      description: "Turn data into tangible business moves with pre-built, tactical recommendations tailored for each customer tier.",
      details: ["High/Medium/Low Impact Ratings", "Effort Estimation Matrix", "Pre-written Campaign Templates", "Cross-sell Recommendations"]
    },
    {
      icon: Shield,
      title: "Enterprise Multi-Tenancy",
      description: "Workspace-isolated data architecture with Clerk JWT security, SSL database encryption, and automated backups.",
      details: ["Workspace-isolated DB schemas", "Clerk Authentication & RBAC", "GDPR/CCPA ready design", "Exportable Audit Reports"]
    }
  ];

  return (
    <div className="gradient-hero min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 mb-4">
            CAPABILITIES & ARCHITECTURE
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Engineered for High-Growth E-commerce
          </h1>
          <p className="text-base sm:text-lg text-white/60">
            Everything you need to analyze, segment, and retain your customer base with high-precision machine learning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {featureList.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="glass rounded-2xl p-6 flex flex-col justify-between card-hover">
                <div>
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">{f.description}</p>
                </div>
                <ul className="space-y-2 pt-4 border-t border-white/10">
                  {f.details.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-xs text-white/70">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="glass rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to explore these features?</h2>
          <p className="text-white/60 text-sm mb-6 max-w-xl mx-auto">
            Upload your first transactions CSV and get real-time segmentation and insights in less than 2 minutes.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white gradient-primary hover:opacity-90 transition-all shadow-lg"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
