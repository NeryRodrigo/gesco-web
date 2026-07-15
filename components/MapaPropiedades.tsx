"use client";
import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Propiedad } from "../types/propiedad";
import { PropiedadSheet } from "../components/mapa/PropiedadSheet";

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      // Zoom 16 es ideal para ver detalle de calle
      map.flyTo(center, 16, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [center, map]);
  return null;
}

type Props = {
  propiedades: Propiedad[];
  onUpdatePropiedad: (p: Propiedad) => Promise<void>;
  onDeletePropiedad: (id: number) => Promise<void>;
};



export default function MapaPropiedades({ propiedades, onUpdatePropiedad, onDeletePropiedad }: Props) {
  const [selectedProp, setSelectedProp] = useState<Propiedad | null>(null);

  // Rojo Pasión Profesional
  //const RED_PASSION = "#D22B2B"; 

  const ROJO_PASION = "#FF0000"; 

  const center: [number, number] = [-25.2867, -57.6475];

  const propiedadesValidas = useMemo(() => {
    return (propiedades ?? []).filter(
      (p) => typeof p.latitud === "number" && p.latitud !== 0
    );
  }, [propiedades]);

  const handleUpdate = async (propData: Propiedad) => {
    try {
      // Invocamos a la función que viene por props para actualizar el estado global
      await onUpdatePropiedad(propData);
      
      // Cerramos el panel después de guardar con éxito
      setSelectedProp(null); 
      //toast.success("Información actualizada en SQL Server");
      alert("Información actualizada en Base de datos");
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("No se pudo guardar la actualización");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta propiedad?")) return;
    
    try {
      await onDeletePropiedad(id);
      setSelectedProp(null);
      alert("Propiedad eliminada correctamente");
    } catch (error) {
      alert("Error al eliminar la propiedad");
    }
  };
  

  return (
    <div className="relative w-full h-full bg-muted">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          zoomControl={false} // Quitamos para ponerlo en un lugar más limpio o dejarlo limpio
        >
          {/* TileLayer más profesional (CartoDB Positron es más limpio que el estándar) */}
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          <MapUpdater center={selectedProp ? [selectedProp.latitud, selectedProp.longitud] : null} />

          {propiedadesValidas.map((p) => {
          const isSelected = selectedProp?.propiedadId === p.propiedadId;
          const ROJO_PASION = "#E31C5F"; // Un rojo tipo Airbnb, muy profesional

          return (
            <CircleMarker
              key={p.propiedadId}
              center={[p.latitud, p.longitud]}
              // Al seleccionar, solo crece un poco para dar feedback, sin ponerse gris
              radius={isSelected ? 11 : 8} 
              pathOptions={{
                // Mantenemos el color rojo siempre, o usamos tu lógica de estado
                fillColor: ROJO_PASION, 
                fillOpacity: 1, // 100% opaco para que no se vea el gris del mapa debajo
                
                // Borde blanco puro: esto quita la apariencia "oscura"
                color: "white", 
                weight: isSelected ? 4 : 2, // Borde un poco más grueso si está seleccionado
                opacity: 1,
              }}
              eventHandlers={{
                click: (e) => {
                  // Esto evita que Leaflet aplique estilos de "foco" internos
                  L.DomEvent.stopPropagation(e); 
                  setSelectedProp(p);
                },
              }}
            />
          );
        })}
        </MapContainer>

        <PropiedadSheet 
            propiedad={selectedProp}
            isOpen={!!selectedProp}
            onClose={() => setSelectedProp(null)}
            onSave={handleUpdate}
            onDelete={handleDelete}
        />
    </div>
  );
}