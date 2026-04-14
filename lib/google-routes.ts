type RoutePoint = {
  label: string;
  latitude: number;
  longitude: number;
};

type ComputeTripInput = {
  origin: RoutePoint;
  destination: RoutePoint;
  intermediates: RoutePoint[];
};

type GoogleRoutesResponse = {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    polyline?: {
      encodedPolyline?: string;
    };
    legs?: Array<{
      distanceMeters?: number;
      duration?: string;
    }>;
    optimizedIntermediateWaypointIndex?: number[];
  }>;
};

export async function computeOptimizedDrivingRoute(
  input: ComputeTripInput
): Promise<GoogleRoutesResponse> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_SERVER_API_KEY manquante");
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.optimizedIntermediateWaypointIndex",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: input.origin.latitude,
              longitude: input.origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: input.destination.latitude,
              longitude: input.destination.longitude,
            },
          },
        },
        intermediates: input.intermediates.map((point) => ({
          location: {
            latLng: {
              latitude: point.latitude,
              longitude: point.longitude,
            },
          },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        optimizeWaypointOrder: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Routes API error: ${errorText}`);
  }

  const json = (await response.json()) as GoogleRoutesResponse;
  return json;
}