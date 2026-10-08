import type { Location } from './types';

// tenta pegar a localização mas nunca trava a marcação:
// se negar permissão, demorar ou o navegador não suportar, volta null
export function getLocation(timeoutMs = 8000): Promise<Location | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: Math.round(pos.coords.accuracy),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

export function mapLink(loc: Location) {
  const { latitude: lat, longitude: lng } = loc;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}
