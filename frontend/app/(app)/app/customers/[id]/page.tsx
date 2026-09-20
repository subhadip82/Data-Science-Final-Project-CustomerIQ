"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/hooks/useApi";
import { customersApi } from "@/lib/api/client";
import { SegmentBadge } from "@/components/shared/Badges";
import { ErrorState, PageSkeleton } from "@/components/shared/States";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft, ShoppingCart, DollarSign, Calendar, MapPin,
  TrendingUp, CheckCircle, ShieldAlert, Clock, Package
} from "lucide-react";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { withToken } = useApi();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    withToken((t) => customersApi.detail(t, customerId))
      .then(setCustomer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [customerId]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!customer) return <ErrorState message="Customer not found" onRetry={() => router.push("/app/customers")} />;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Back button */}
      <Link
        href="/app/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
      </Link>

      {/* Header Profile */}
      <div className="card-base p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl font-bold">
            {(customer.name || customer.customer_code || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{customer.name || customer.customer_code}</h1>
              {customer.segment_label && <SegmentBadge segment={customer.segment_label} />}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>Code: {customer.customer_code}</span>
              {customer.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {customer.country}
                </span>
              )}
              {customer.last_purchase_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Last active: {new Date(customer.last_purchase_date).toLocaleDateString("en-IN")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(customer.total_revenue || 0)}</p>
          </div>
        </div>
      </div>

      {/* RFM & Behavior Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-base p-4">
          <p className="text-xs text-muted-foreground mb-1">Recency</p>
          <p className="text-2xl font-bold">{customer.recency_days ?? "—"} <span className="text-xs text-muted-foreground font-normal">days ago</span></p>
          <div className="mt-2 text-xs font-semibold text-indigo-400">Score: {customer.r_score ?? "-"}/5</div>
        </div>

        <div className="card-base p-4">
          <p className="text-xs text-muted-foreground mb-1">Frequency</p>
          <p className="text-2xl font-bold">{customer.total_orders ?? 0} <span className="text-xs text-muted-foreground font-normal">orders</span></p>
          <div className="mt-2 text-xs font-semibold text-blue-400">Score: {customer.f_score ?? "-"}/5</div>
        </div>

        <div className="card-base p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold">{formatCurrency(customer.avg_order_value || 0)}</p>
          <div className="mt-2 text-xs font-semibold text-purple-400">Score: {customer.m_score ?? "-"}/5</div>
        </div>

        <div className="card-base p-4">
          <p className="text-xs text-muted-foreground mb-1">Combined RFM</p>
          <p className="text-2xl font-bold font-mono">{customer.rfm_score ?? "—"}</p>
          <div className="mt-2 text-xs font-semibold text-emerald-400">{customer.segment_label || "Unassigned"}</div>
        </div>
      </div>

      {/* Recommended Playbook for this Customer */}
      {customer.recommended_actions && customer.recommended_actions.length > 0 && (
        <div className="card-base p-5 border-indigo-500/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
            <CheckCircle className="w-4 h-4" /> Next Recommended Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {customer.recommended_actions.map((act: string, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-medium">
                {act}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History Table */}
      <div className="card-base overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" /> Order History ({customer.orders?.length ?? 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                {["Invoice", "Date", "Product", "Quantity", "Unit Price", "Total"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!customer.orders || customer.orders.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No orders recorded for this customer.
                  </td>
                </tr>
              ) : (
                customer.orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-medium">{o.invoice_id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {o.order_date ? new Date(o.order_date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium max-w-xs truncate">{o.product}</td>
                    <td className="px-4 py-3 text-xs">{o.quantity}</td>
                    <td className="px-4 py-3 text-xs">{formatCurrency(o.unit_price || 0)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-400">{formatCurrency(o.total_price || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
