import React from "react";
import { MapPin, Package, DollarSign, TrendingDown, Info, ShoppingBag } from "lucide-react";
import { SaleListing } from "@/types";
import { COMMODITY_LIST } from "@/lib/api/metadataApi";

interface MatchCardProps {
  sale: SaleListing;
  onAccept?: () => void;
}

export default function MatchCard({ sale, onAccept }: MatchCardProps) {
  const commodityInfo = COMMODITY_LIST.find(c => c.id === sale.commodity);
  const availableDate = new Date(sale.availableDate);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-border/80 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Petani Oversupply</h4>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tersedia {availableDate.toLocaleDateString("id-ID")}</span>
          </div>
        </div>
        <div className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 px-2 py-1 rounded-full text-[10px] font-bold">
          98% COCOK
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-4 border border-border/40 grid grid-cols-2 gap-y-3 mb-4">
        <div className="flex items-start gap-2">
          <Package className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tersedia</span>
            <span className="font-bold text-sm text-foreground">{sale.volume.toLocaleString()} {sale.unit}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <DollarSign className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Harga Penawaran</span>
            <span className="font-bold text-sm text-foreground">
              {sale.minPricePerUnit ? `Rp${sale.minPricePerUnit.toLocaleString()}` : "Nego"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 col-span-2 mt-1">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Asal Lokasi</span>
            <span className="font-semibold text-xs text-foreground">{sale.locationName}</span>
          </div>
        </div>
      </div>

      {onAccept && (
        <button 
          onClick={onAccept}
          className="w-full bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl py-3 text-sm font-bold flex flex-row items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          Mulai Negosiasi
        </button>
      )}
    </div>
  );
}
