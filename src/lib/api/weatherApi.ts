export const getWeatherByCoords = (lat: number, lng: number) => {
  const seed = Math.abs(Math.sin(lat + lng));
  const isRainy = seed > 0.4;
  const temp = Math.round(23 + seed * 8);
  const humidity = Math.round(65 + (1 - seed) * 30);

  return {
    status: isRainy ? "Hujan Ringan" : "Cerah Berawan",
    icon: isRainy ? "🌧️" : "⛅",
    temp: `${temp}°C`,
    humidity: `${humidity}%`,
    windSpeed: "12 km/jam",
    suggestion: isRainy
      ? "Waspada kelembaban tinggi memicu jamur. Tunda pemupukan tabur."
      : "Kondisi ideal untuk penyemprotan nutrisi dan penyiangan gulma.",
  };
};
