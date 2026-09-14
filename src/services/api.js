import { crops, getCropById, getActivePricingRule } from '../data/mock-crops.js';
import { facilities, getFacilityById, getFacilitiesByCropType } from '../data/mock-facilities.js';
import {
  todayPrices,
  historicalPrices,
  predictions,
  aiWarnings,
  weeklySparklines,
  getFacilityPrice,
  getTodayPrice,
} from '../data/mock-prices.js';
import {
  transactions,
  reviews,
  getReviewsByFacilityId,
} from '../data/mock-transactions.js';
import { getDrafts } from '../utils/offline.js';
import { getToken } from '../auth.js';

let API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

if (API_BASE_URL && !API_BASE_URL.startsWith('http')) {
  API_BASE_URL = 'https://' + API_BASE_URL;
}

const LOCAL_TX_KEY = 'agriculturist_transactions';
const LOCAL_REVIEW_KEY = 'agriculturist_reviews';

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    if (import.meta.env.PROD) {
      throw new Error('VITE_API_BASE_URL is not configured');
    }

    return false;
  }

  return true;
}

async function apiGet(path, fallback) {
  if (!requireApiBaseUrl()) {
    return fallback();
  }

  try {
    const headers = {
      Accept: 'application/json',
    };

    const token = getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API error] ${path}`, error);

    if (import.meta.env.PROD) {
      throw error;
    }

    return fallback();
  }
}

async function apiPost(path, payload, fallback) {
  if (!requireApiBaseUrl()) {
    return fallback();
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const token = getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API error] ${path}`, error);

    if (import.meta.env.PROD) {
      throw error;
    }

    return fallback();
  }
}

function readLocalList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeLocalList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeDraftAsTransaction(draft) {
  return {
    id: draft.id,
    userId: draft.userId || 'demo-farmer-001',
    cropId: draft.cropId || draft.crop,
    cropName: draft.cropName,
    cropIcon: draft.cropIcon,
    facilityId: draft.facilityId || null,
    facilityName: draft.facilityName || 'ไม่ระบุสถานที่รับซื้อ',
    totalWeight: Number(draft.totalWeight ?? draft.weight ?? 0),
    qualityMetric: Number(draft.qualityMetric ?? draft.moisture ?? 0),
    qualityLabel: draft.qualityLabel || 'ไม่ระบุคุณภาพ',
    predictedPrice: Number(draft.predictedPrice ?? draft.netPrice ?? 0),
    actualReceived: draft.actualReceived ?? null,
    priceDifference: draft.priceDifference ?? null,
    pricePerUnit: draft.pricePerUnit ?? null,
    date: (draft.savedAt || new Date().toISOString()).slice(0, 10),
    status: draft.status || 'draft',
    notes: draft.notes || 'บันทึกจากโหมดออฟไลน์',
  };
}

// Crops
export async function fetchCrops() {
  return apiGet('/crops', () => crops);
}

export async function fetchCropById(id) {
  return apiGet(`/crops/${id}`, () => getCropById(id));
}

export async function fetchPricingRule(cropId) {
  return apiGet(`/pricing-rules/${cropId}`, () => getActivePricingRule(cropId));
}

// Facilities
export async function fetchFacilities() {
  return apiGet('/facilities', () => facilities);
}

export async function fetchFacilityById(id) {
  return apiGet(`/facilities/${id}`, () => getFacilityById(id));
}

export async function fetchFacilitiesByCrop(cropId) {
  return apiGet(
    `/facilities?cropId=${encodeURIComponent(cropId)}`,
    () => getFacilitiesByCropType(cropId)
  );
}

export async function fetchNearbyFacilities(
  lat,
  lng,
  radius,
  cropId,
  weight,
  quality
) {
  return apiGet(
    `/facilities/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}&cropId=${encodeURIComponent(cropId)}&weight=${encodeURIComponent(weight)}&quality=${encodeURIComponent(quality)}`,
    () => []
  );
}

// Prices
export async function fetchTodayPrices() {
  return apiGet('/prices/today', () => todayPrices);
}

export async function fetchTodayPrice(cropId) {
  return apiGet(`/prices/today/${cropId}`, () => getTodayPrice(cropId));
}

export async function fetchFacilityPrice(facilityId, cropId) {
  return apiGet(
    `/facilities/${facilityId}/prices/${cropId}`,
    () => getFacilityPrice(facilityId, cropId)
  );
}

export async function fetchHistoricalPrices(cropId) {
  return apiGet(
    `/prices/history/${cropId}`,
    () => historicalPrices[cropId] || []
  );
}

export async function fetchPredictions(cropId) {
  return apiGet(
    `/predictions/${cropId}`,
    () => predictions[cropId] || []
  );
}

export async function fetchAiWarnings() {
  return apiGet('/warnings', () => aiWarnings);
}

export async function fetchWeeklySparklines() {
  return apiGet('/prices/sparklines', () => weeklySparklines);
}

// Calculations
export async function calculatePriceFromBackend(payload) {
  return apiPost('/calculations', payload, () => {
    throw new Error('Backend calculation failed');
  });
}

// Transactions
export async function fetchTransactions() {
  return apiGet('/transactions', () => {
    const localTransactions = readLocalList(LOCAL_TX_KEY);
    const localDrafts = getDrafts().map(normalizeDraftAsTransaction);

    return [...localTransactions, ...localDrafts]
      .filter(
        (tx, index, list) =>
          list.findIndex((item) => item.id === tx.id) === index
      )
      .sort((a, b) =>
        String(b.date).localeCompare(String(a.date))
      );
  });
}

export async function saveTransaction(transaction) {
  return apiPost('/transactions', transaction, () => {
    const saved = {
      ...transaction,
      id: transaction.id || `tx-${Date.now()}`,
      date:
        transaction.date ||
        new Date().toISOString().slice(0, 10),
    };

    const localTransactions = readLocalList(LOCAL_TX_KEY);

    localTransactions.unshift(saved);
    writeLocalList(LOCAL_TX_KEY, localTransactions);

    transactions.unshift(saved);

    return saved;
  });
}

// Reviews
export async function fetchReviewsByFacility(facilityId) {
  return apiGet(`/facilities/${facilityId}/reviews`, () => [
    ...readLocalList(LOCAL_REVIEW_KEY).filter(
      (review) => review.facilityId === facilityId
    ),
    ...getReviewsByFacilityId(facilityId),
  ]);
}

export async function saveReview(review) {
  return apiPost('/reviews', review, () => {
    const saved = {
      ...review,
      id: review.id || `rev-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const localReviews = readLocalList(LOCAL_REVIEW_KEY);

    localReviews.unshift(saved);
    writeLocalList(LOCAL_REVIEW_KEY, localReviews);

    reviews.unshift(saved);

    return saved;
  });
}
