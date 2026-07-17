import React from "react";
import { Clock, MapPin, Package, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import { DemandListing } from "@/types";
import { COMMODITY_LIST } from "@/lib/api/metadataApi";

interface DemandCardProps {
  demand: DemandListing;
  onClick?: () => void;
}

export default function DemandCard({ demand, onClick }: DemandCardProps) {
  const commodityInfo = COMMODITY_LIST.find(c => c.id === demand.commodity);
  const isFulfilled = demand.status === "FULFILLED";
  const isClosed = demand.status === "CLOSED" || demand.status === "CANCELLED";
  const isOpen = demand.status === "OPEN";

  const deadlineDate = new Date(demand.deadline);
  const isUrgent = isOpen && (deadlineDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000); // within 3 days

  return (
    <div 
      onClick={onClick}
      className={`bg-card border rounded-3xl p-5 shadow-sm transition-all ${
        onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-[0.98]" : ""
      } ${
        isFulfilled ? "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10" :
        isClosed ? "border-border bg-muted/30 opacity-75" :
        isUrgent ? "border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10" :
        "border-border/80"
      }`}
    >
      <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xl">
            {commodityInfo?.icon || "📦"}
          </div>
          <div>
            <h4 className="font-bold text-foreground capitalize leading-tight">
              Kebutuhan {commodityInfo?.label || demand.commodity}
            </h4>
            <span className="text-xs font-medium text-muted-foreground mt-0.5 block">
              ID: {demand.id.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider ${
          isOpen ? "bg-sky-500/10 text-sky-700 border-sky-500/20" :
          isFulfilled ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
          "bg-muted text-muted-foreground border-border"
        }`}>
          {demand.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Volume</span>
            <span className="font-bold text-foreground">{demand.volume.toLocaleString()} {demand.unit}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${isUrgent ? "text-amber-500" : "text-primary"}`} />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Tenggat Waktu</span>
            <span className={`font-bold ${isUrgent ? "text-amber-600 dark:text-amber-500" : "text-foreground"}`}>
              {deadlineDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 col-span-2 mt-1 bg-muted/50 p-2.5 rounded-xl border border-border/50">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Lokasi Pengiriman</span>
            <span className="font-semibold text-foreground text-xs">{demand.locationName}</span>
          </div>
        </div>
      </div>

      {onClick && (
        <div className="mt-4 pt-3 border-t border-border/40 flex justify-end items-center text-primary text-xs font-bold gap-1">
          Lihat Pasokan Cocok <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
