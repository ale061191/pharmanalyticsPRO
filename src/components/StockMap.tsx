"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icon issues in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons - Semantic Colors
const greenMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const goldMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface StockLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    city: string;
    municipio?: string;
    address: string;
    stock: number;
}

interface StockMapProps {
    productId: string;
    locations?: StockLocation[]; // NEW: Allow passing locations directly for data consistency
    filters?: {
        city?: string;
        municipio?: string;
        store?: string;
    };
}

// Component to auto-zoom to bounds
function MapBounds({ locations }: { locations: StockLocation[] }) {
    const map = useMap();

    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [locations, map]);

    return null;
}

export default function StockMap({ productId, locations: externalLocations, filters }: StockMapProps) {
    const [internalLocations, setInternalLocations] = useState<StockLocation[]>([]);
    const [loading, setLoading] = useState(!externalLocations); // Don't load if locations provided
    const [error, setError] = useState<string | null>(null);

    // Use external locations if provided, otherwise use internal state
    const locations = externalLocations || internalLocations;

    useEffect(() => {
        // Skip API fetch if locations are provided externally
        if (externalLocations) {
            setLoading(false);
            return;
        }

        const fetchGeoStock = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/geo/stock?productId=${productId}`);
                const data = await res.json();

                if (data.error) throw new Error(data.error);
                setInternalLocations(data.locations);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchGeoStock();
        }
    }, [productId, externalLocations]);

    // Apply filters locally for reactivity
    const filteredLocations = locations.filter(loc => {
        if (filters?.city && loc.city.toLowerCase() !== filters.city.toLowerCase()) return false;
        if (filters?.municipio && loc.municipio?.toLowerCase() !== filters.municipio.toLowerCase()) return false;
        if (filters?.store && !loc.name.toLowerCase().includes(filters.store.toLowerCase())) return false;
        return true;
    });

    if (loading) return <div className="h-[500px] w-full flex items-center justify-center bg-slate-50 rounded-3xl animate-pulse">Loading Map...</div>;
    if (error) return <div className="h-[500px] w-full flex items-center justify-center bg-red-50 text-red-500 rounded-3xl">Error loading map: {error}</div>;
    if (locations.length === 0) return <div className="h-[500px] w-full flex items-center justify-center bg-slate-50 text-slate-500 rounded-3xl italic">No hay stock disponible para mostrar en el mapa.</div>;

    const center: [number, number] = [8.0, -66.0];

    return (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 border border-slate-200 z-0 relative">
            <MapContainer center={center} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <MapBounds locations={filteredLocations} />

                {filteredLocations.map(loc => {
                    let markerIcon;
                    if (loc.stock === 0) markerIcon = redMarker;
                    else if (loc.stock <= 50) markerIcon = goldMarker;
                    else markerIcon = greenMarker;

                    return (
                        <Marker
                            key={loc.id}
                            position={[loc.lat, loc.lng]}
                            icon={markerIcon}
                        >
                            <Popup className="premium-popup">
                                <div className="p-2 min-w-[150px]">
                                    <h3 className="font-bold text-sm text-slate-900 mb-0.5">{loc.name}</h3>
                                    <p className="text-[10px] text-blue-500 uppercase tracking-widest font-bold mb-2">{loc.city}</p>
                                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{loc.address}</p>
                                    <div className={`flex items-center justify-between p-2 rounded-xl ${loc.stock > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                                        <span className={`text-xs font-medium font-serif ${loc.stock > 0 ? 'text-blue-700' : 'text-red-700'}`}>STOCK</span>
                                        <span className={`text-lg font-black ${loc.stock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                            {loc.stock}
                                        </span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-lg z-[1000] text-[10px] space-y-2 pointer-events-none font-bold text-slate-500 uppercase tracking-tighter">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Stock Saludable {'>'} 50
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div> Stock Bajo 1-50
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Sin Stock (0)
                </div>
            </div>
        </div>
    );
}


