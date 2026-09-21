import { request } from './api';

export const mapsService = {
  async getAutocomplete(input) {
    if (!input || input.trim().length === 0) return { success: true, suggestions: [] };
    return request('/maps/autocomplete', { params: { input } });
  },

  async geocode(address, latlng) {
    const params = {};
    if (address) params.address = address;
    else if (latlng) params.latlng = latlng;
    return request('/maps/geocode', { params });
  },

  async calculateDistance(pickup, drop) {
    return request('/maps/distance', { params: { pickup, drop } });
  },

  async getDirections(origin, destination) {
    return request('/maps/directions', { params: { origin, destination } });
  },
};
