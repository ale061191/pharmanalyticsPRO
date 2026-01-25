'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Fix for default markers not loading in some builds
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const createIcon = (color: string) =>
    new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

const icons = {
    neutral: createIcon('violet'),
    healthy: createIcon('green'),
    warning: createIcon('gold'),
    critical: createIcon('red')
};

interface Branch {
    id: string;
    name: string;
    city: string;
    municipality?: string;
    lat: number;
    lng: number;
    address?: string;
    status: 'neutral' | 'healthy' | 'warning' | 'critical';
    stockCount?: number;
}

interface LeafletMapProps {
    branches: Branch[];
    isProductSelected: boolean;
}

// Helper component to auto-zoom
function MapUpdater({ branches }: { branches: Branch[] }) {
    const map = useMap();

    useEffect(() => {
        if (branches.length > 0) {
            const bounds = L.latLngBounds(branches.map(b => [b.lat, b.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [branches, map]);

    return null;
}

export default function LeafletMap({ branches, isProductSelected }: LeafletMapProps) {
    const center: [number, number] = [10.4806, -66.9036]; // Caracas Default

    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="outline-none"
        >
            <MapUpdater branches={branches} />
            <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {branches.map(branch => (
                branch.lat && branch.lng && (
                    <Marker
                        key={branch.id}
                        position={[branch.lat, branch.lng]}
                        icon={icons[branch.status] || icons.neutral}
                    >
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold text-slate-800 text-sm">{branch.name}</h3>
                                <p className="text-xs text-slate-500 mb-2">{branch.address}</p>

                                {isProductSelected ? (
                                    <div className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-md border ${branch.status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200' :
                                        branch.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {branch.status === 'healthy' && <CheckCircle size={12} />}
                                        {branch.status === 'warning' && <AlertTriangle size={12} />}
                                        {branch.status === 'critical' && <XCircle size={12} />}
                                        Stock: {branch.stockCount} uds.
                                    </div>
                                ) : (
                                    <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase tracking-wide font-medium">
                                        Operativa
                                    </span>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}
        </MapContainer>
    );
}
