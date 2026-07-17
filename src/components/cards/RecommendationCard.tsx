import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { OversupplyStatus } from "@/types";

interface RecommendationCardProps {
  status: OversupplyStatus;
  suggestedDate: string;
  message: string;
}

export default function RecommendationCard({ status, suggestedDate, message }: RecommendationCardProps) {
  const isWarning = status === "OVERSUPPLY" || status === "WASPADA";
  
  const config = {
    OVERSUPPLY: {
      color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
      iconColor: "text-red-500",
      icon: <AlertTriangle className="w-6 h-6" />,
      title: "Peringatan Oversupply",
    },
    WASPADA: {
      color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
      iconColor: "text-yellow-500",
      icon: <Clock className="w-6 h-6" />,
      title: "Waspada Gejolak Harga",
    },
    AMAN: {
      color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
      iconColor: "text-green-500",
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Kondisi Pasar Aman",
    },
  };

  const currentConfig = config[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl p-5 border shadow-sm flex gap-4 items-start ${currentConfig.color}`}
    >
      <div className={`shrink-0 p-2 rounded-full bg-white dark:bg-zinc-900 shadow-sm ${currentConfig.iconColor}`}>
        {currentConfig.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{currentConfig.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
          {message}
        </p>
        <div className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm">
          <Clock className="w-4 h-4 text-zinc-400" />
          Rekomendasi Panen: {new Date(suggestedDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    </motion.div>
  );
}
