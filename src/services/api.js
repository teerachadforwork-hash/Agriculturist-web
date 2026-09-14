// ══════════════════════════════════════════════════
// API Service Layer — Data Access Abstraction
// เปลี่ยนจาก mock เป็น fetch API จริงได้ง่าย
// ══════════════════════════════════════════════════

import { crops, getCropById, getActivePricingRule } from '../data/mock-crops.js';
import { facilities, getFacilityById, getFacilitiesByCropType } from '../data/mock-facilities.js';
import { todayPrices, facilityPrices, historicalPrices, predictions, aiWarnings, weeklySparklines, getFacilityPrice, getTodayPrice } from '../data/mock-prices.js';
import { transactions, reviews, getTransactionsByUserId, getReviewsByFacilityId } from '../data/mock-transactions.js';
import { getDrafts } from '../utils/offline.js';

let API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (API_BASE_URL && !API_BASE_URL.startsWith('http')) {
  API_BASE_URL = 'https://' + API_BASE_URL;
}
const LOCAL_TX_KEY = 'agriculturist_transactions';
const LOCAL_REVIEW_KEY = 'agriculturist_reviews';

async function apiGet(path, fallback) {
  if (!API_BASE_URL) return fallback();

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`[API fallback] ${path}`, error);
    return fallback();
  }
}

async function apiPost(path, payload, fallback) {
  if (!API_BASE_URL) return fallback();

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`[API fallback] ${path}`, error);
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
    facilityName: draft.facilityName || 'ยังไม่เลือกลานรับซื้อ',
    totalWeight: Number(draft.totalWeight ?? draft.weight ?? 0),
    qualityMetric: Number(draft.qualityMetric ?? draft.moisture ?? 0),
    qualityLabel: draft.qualityLabel || 'ค่าคุณภาพ',
    predictedPrice: Number(draft.predictedPrice ?? draft.netPrice ?? 0),
    actualReceived: draft.actualReceived ?? null,
    priceDifference: draft.priceDifference ?? null,
    pricePerUnit: draft.pricePerUnit ?? null,
    date: (draft.savedAt || new Date().toISOString()).slice(0, 10),
    status: draft.status || 'draft',
    notes: draft.notes || 'บันทึกจากเครื่องคำนวณ',
  };
}

// ── Crops ──
export async function fetchCrops() {
  return apiGet('/crops', () => crops);
}

export async function fetchCropById(id) {
  return apiGet(`/crops/${id}`, () => getCropById(id));
}

export async function fetchPricingRule(cropId) {
  return apiGet(`/pricing-rules/${cropId}`, () => getActivePricingRule(cropId));
}

// ── Facilities ──
export async function fetchFacilities() {
  return apiGet('/facilities', () => facilities);
}

export async function fetchFacilityById(id) {
  return apiGet(`/facilities/${id}`, () => getFacilityById(id));
}

export async function fetchFacilitiesByCrop(cropId) {
  return apiGet(`/facilities?cropId=${encodeURIComponent(cropId)}`, () => getFacilitiesByCropType(cropId));
}

// ── Prices ──
export async function fetchTodayPrices() {
  return apiGet('/prices/today', () => todayPrices);
}

export async function fetchTodayPrice(cropId) {
  return apiGet(`/prices/today/${cropId}`, () => getTodayPrice(cropId));
}

export async function fetchFacilityPrice(facilityId, cropId) {
  return apiGet(`/facilities/${facilityId}/prices/${cropId}`, () => getFacilityPrice(facilityId, cropId));
}

export async function fetchHistoricalPrices(cropId) {
  return apiGet(`/prices/history/${cropId}`, () => historicalPrices[cropId] || []);
}

export async function fetchPredictions(cropId) {
  return apiGet(`/predictions/${cropId}`, () => predictions[cropId] || []);
}

export async function fetchAiWarnings() {
  return apiGet('/warnings', () => aiWarnings);
}

export async function fetchWeeklySparklines() {
  return apiGet('/prices/sparklines', () => weeklySparklines);
}

// ── Transactions ──
export async function fetchTransactions(userId = 'user-001') {
  return apiGet(`/transactions?userId=${encodeURIComponent(userId)}`, () => {
    const localTransactions = readLocalList(LOCAL_TX_KEY);
    const localDrafts = getDrafts().map(normalizeDraftAsTransaction);
    return [...localTransactions, ...localDrafts, ...getTransactionsByUserId(userId)]
      .filter((tx, index, list) => list.findIndex(item => item.id === tx.id) === index)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  });
}

export async function saveTransaction(transaction) {
  return apiPost('/transactions', transaction, () => {
    const saved = {
      ...transaction,
      id: transaction.id || `tx-${Date.now()}`,
      date: transaction.date || new Date().toISOString().slice(0, 10),
    };
    const localTransactions = readLocalList(LOCAL_TX_KEY);
    localTransactions.unshift(saved);
    writeLocalList(LOCAL_TX_KEY, localTransactions);
    transactions.unshift(saved);
    return saved;
  });
}

// ── Reviews ──
export async function fetchReviewsByFacility(facilityId) {
  return apiGet(`/facilities/${facilityId}/reviews`, () => [
    ...readLocalList(LOCAL_REVIEW_KEY).filter(r => r.facilityId === facilityId),
    ...getReviewsByFacilityId(facilityId),
  ]);
}

export async function saveReview(review) {
  return apiPost('/reviews', review, () => {
    const saved = { ...review, id: review.id || `rev-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    const localReviews = readLocalList(LOCAL_REVIEW_KEY);
    localReviews.unshift(saved);
    writeLocalList(LOCAL_REVIEW_KEY, localReviews);
    reviews.unshift(saved);
    return saved;
  });
}
