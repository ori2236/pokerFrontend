import { api } from "./api";

export type BonusRow = {
  id: number;
  title: string;
  description: string;
  amount: number;
  imageBase64: string | null;
  imageUri: string | null;
  isActive: boolean;
  hasPendingRequest: boolean;
  canRequest?: boolean;
};

export function extractArrayPayload(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.bonuses)) return payload.bonuses;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function normalizeBonusRow(raw: any): BonusRow {
  const imageBase64 =
    typeof raw?.image_base64 === "string"
      ? raw.image_base64
      : typeof raw?.imageBase64 === "string"
        ? raw.imageBase64
        : null;

  const remoteImage =
    typeof raw?.image_url === "string"
      ? raw.image_url
      : typeof raw?.imageUrl === "string"
        ? raw.imageUrl
        : null;

  return {
    id: Number(raw?.id ?? 0),
    title: String(raw?.title ?? raw?.name ?? ""),
    description: String(raw?.description ?? ""),
    amount: Number(raw?.amount ?? raw?.reward_amount ?? raw?.amount_total ?? 0),
    imageBase64,
    imageUri: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : remoteImage,
    isActive: raw?.is_active ?? raw?.isActive ?? true,
    hasPendingRequest: Boolean(raw?.has_pending_request ?? raw?.pending_request ?? raw?.hasPendingRequest),
    canRequest:
      typeof raw?.can_request === "boolean"
        ? raw.can_request
        : typeof raw?.canRequest === "boolean"
          ? raw.canRequest
          : undefined,
  };
}

export function normalizeBonusList(payload: any): BonusRow[] {
  return extractArrayPayload(payload).map(normalizeBonusRow);
}

export function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export async function fetchBonuses(includeInactive = false) {
  const query = includeInactive ? "?includeInactive=true" : "";
  const response = await api.get(`/bonuses${query}`);
  return normalizeBonusList(response.data);
}
