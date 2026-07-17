"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, Navigation, Lock, Unlock, AlertTriangle } from "lucide-react";

interface LahanMapProps {
  initialCoords?: { lat: number; lng: number };
  initialAlamat?: string;
  onChange: (data: { lat: number; lng: number; alamat: string }) => void;
}

export default function LahanMap({ initialCoords, initialAlamat, onChange }: LahanMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);

  const [coords, setCoords] = useState(initialCoords || { lat: -7.2504, lng: 112.7688 }); // Default Surabaya
  const [alamat, setAlamat] = useState(initialAlamat || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLocked, setIsMapLocked] = useState(true); // Default locked untuk kenyamanan mobile-first
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load Leaflet dynamically client-side
  useEffect(() => {
    if (typeof window === "undefined" || leafletLoaded || loadError) return;

    let isCleanedUp = false;

    // Load Leaflet CSS dynamically to avoid SSR styling issues
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "";
    document.head.appendChild(link);

    const loadLeaflet = async () => {
      try {
        const L = await import("leaflet");
        
        if (isCleanedUp || !mapRef.current) return;

        // Cegah re-initialisasi jika kontainer sudah memiliki peta aktif
        if ((mapRef.current as any)._leaflet_id) {
          setLeafletLoaded(true);
          return;
        }

        // Perbaikan icon default Leaflet di Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        // Inisialisasi Peta
        const map = L.map(mapRef.current, {
          center: [coords.lat, coords.lng],
          zoom: 13,
          zoomControl: false, // Kita matikan untuk dicustom posisinya biar aman di mobile
          dragging: !isMapLocked, // dragging dikontrol dari state
          scrollWheelZoom: !isMapLocked,
          touchZoom: !isMapLocked,
        });

        // Tambah Tile Layer OpenStreetMap
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // Tambah Zoom Control di kanan bawah (biar ga nutupin jempol kiri)
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Tambah Marker
        const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
        
        markerInstance.current = marker;
        leafletMapInstance.current = map;

        // Callback saat marker ditarik (dragend)
        marker.on("dragend", async (event: any) => {
          const position = event.target.getLatLng();
          setCoords({ lat: position.lat, lng: position.lng });
          await reverseGeocode(position.lat, position.lng);
        });

        // Callback saat peta diklik
        map.on("click", async (event: any) => {
          if (isMapLocked) return; // Abaikan jika peta terkunci
          const { lat, lng } = event.latlng;
          marker.setLatLng([lat, lng]);
          setCoords({ lat, lng });
          await reverseGeocode(lat, lng);
        });

        setLeafletLoaded(true);
      } catch (err) {
        console.error("Gagal memuat Leaflet:", err);
        setLoadError(true);
      }
    };

    // Pastikan link stylesheet terpasang sebelum load leaflet
    link.onload = () => {
      loadLeaflet();
    };
    link.onerror = () => {
      setLoadError(true);
    };

    return () => {
      isCleanedUp = true;
      // Bersihkan instance peta saat component unmount
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  // Update opsi lock/unlock peta
  useEffect(() => {
    const map = leafletMapInstance.current;
    if (!map) return;

    if (isMapLocked) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      if (map.touchZoom) map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      if (map.touchZoom) map.touchZoom.enable();
    }
  }, [isMapLocked]);

  // Sinkronisasi koordinat & alamat ke parent component
  const triggerChange = (lat: number, lng: number, addr: string) => {
    onChange({ lat, lng, alamat: addr });
  };

  // Reverse Geocoding (Koordinat -> Alamat) menggunakan Nominatim OSM
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "id" } }
      );
      if (res.ok) {
        const data = await res.json();
        const displayName = data.display_name || `Lahan Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        setAlamat(displayName);
        triggerChange(lat, lng, displayName);
      }
    } catch (e) {
      const fallbackAddr = `Lahan Koordinat (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      setAlamat(fallbackAddr);
      triggerChange(lat, lng, fallbackAddr);
    }
  };

  // Geocoding Cari Alamat (Teks -> Koordinat)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=id&limit=1`,
        { headers: { "Accept-Language": "id" } }
      );
      
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const target = results[0];
          const lat = parseFloat(target.lat);
          const lng = parseFloat(target.lon);
          const displayName = target.display_name;

          setCoords({ lat, lng });
          setAlamat(displayName);
          triggerChange(lat, lng, displayName);

          // Update Leaflet Map secara dinamis jika ada
          if (leafletMapInstance.current && markerInstance.current) {
            leafletMapInstance.current.setView([lat, lng], 14);
            markerInstance.current.setLatLng([lat, lng]);
          }
        } else {
          alert("Alamat tidak ditemukan di Indonesia. Silakan periksa kembali.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan koneksi saat mencari lokasi.");
    } finally {
      setIsSearching(false);
    }
  };

  // Mendapatkan Lokasi Saat Ini (GPS HP)
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung deteksi lokasi (GPS).");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        await reverseGeocode(latitude, longitude);

        if (leafletMapInstance.current && markerInstance.current) {
          leafletMapInstance.current.setView([latitude, longitude], 15);
          markerInstance.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        alert("Gagal mendeteksi lokasi. Pastikan izin GPS aktif.");
      },
      { enableHighAccuracy: true }
    );
  };

  // Mock Map Geolocation Picker (Jika terjadi Load Error atau Offline)
  const handleMockCoordsChange = (type: "lat" | "lng", val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    
    const newCoords = { ...coords, [type]: num };
    setCoords(newCoords);
    const mockAddr = `Koordinat Manual: ${newCoords.lat.toFixed(5)}, ${newCoords.lng.toFixed(5)}`;
    setAlamat(mockAddr);
    triggerChange(newCoords.lat, newCoords.lng, mockAddr);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & GPS Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari desa, kecamatan, atau kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch(e);
              }
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
        </div>
        
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSearch(e);
          }}
          disabled={isSearching}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-2xl text-xs flex items-center justify-center min-h-[44px] hover:bg-primary/95 transition-all disabled:opacity-50"
        >
          {isSearching ? "Cari..." : "Cari"}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleGetCurrentLocation();
          }}
          title="Gunakan GPS saya"
          className="p-2.5 bg-secondary text-secondary-foreground border border-primary/20 rounded-2xl flex items-center justify-center min-h-[44px] hover:bg-primary/10 transition-all"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-3xl border border-border/70 overflow-hidden shadow-sm bg-muted/30">
        
        {/* Toggle Lock / Scroll lock (Sangat penting untuk kenyamanan HP) */}
        <button
          type="button"
          onClick={() => setIsMapLocked(!isMapLocked)}
          className={`absolute top-3 left-3 z-[1000] p-2.5 rounded-2xl shadow-md border text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[40px] ${
            isMapLocked
              ? "bg-amber-550 bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
              : "bg-white text-foreground border-border hover:bg-muted"
          }`}
        >
          {isMapLocked ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Geser Peta Terkunci</span>
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              <span>Peta Siap Digeser</span>
            </>
          )}
        </button>

        {/* Peta Fisik Leaflet */}
        {!loadError ? (
          <div 
            ref={mapRef} 
            className="w-full h-64 z-10" 
            style={{ touchAction: isMapLocked ? "auto" : "none" }} 
          />
        ) : (
          // Fallback UI jika Leaflet error/offline
          <div className="w-full h-64 bg-card flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <div>
              <h4 className="font-bold text-sm text-foreground">Gagal memuat peta peta interaktif</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Anda offline atau dependensi peta belum terpasang. Tenang, Anda tetap bisa memasukkan koordinat manual di bawah.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase text-left block">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={coords.lat}
                  onChange={(e) => handleMockCoordsChange("lat", e.target.value)}
                  className="w-full text-center px-2 py-1.5 border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase text-left block">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={coords.lng}
                  onChange={(e) => handleMockCoordsChange("lng", e.target.value)}
                  className="w-full text-center px-2 py-1.5 border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Overlay Informasi Koordinat (Sisi Bawah Peta) */}
        <div className="absolute bottom-0 inset-x-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 z-[999] flex items-start gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-xl mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Pin Lokasi Aktif</span>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5" title={alamat || "Belum dipilih"}>
              {alamat || "Ketuk peta atau cari lokasi..."}
            </p>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Koordinat: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </div>
        </div>
      </div>
      
      {isMapLocked && !loadError && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          💡 <strong>Tips Mobile:</strong> Jika ingin menggeser/zoom peta, ketuk tombol <strong>"Geser Peta Terkunci"</strong> di atas. Jika ingin scroll halaman ke bawah/atas, biarkan tombol menyala oranye.
        </p>
      )}
    </div>
  );
}
