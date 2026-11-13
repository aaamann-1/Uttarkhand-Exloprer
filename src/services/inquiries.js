import { createStore, submitPublicRecord } from "./createStore";
import { useStore } from "../hooks/useStore";

const store = createStore("uk_inquiries", []);

export const INQUIRY_STATUSES = ["New", "In Progress", "Contacted", "Resolved"];
export const INQUIRY_SOURCES = { contact: "Contact", planTrip: "Plan My Trip" };

// data: { source, name, email, phone, inquiryType, destination, travelDate,
//         travellers, message, itinerary? }
export async function addInquiry(data) {
  const entry = await submitPublicRecord("uk_inquiries", data);
  store.setState((list) => [entry, ...list], { persistRemote: false });
  return entry;
}

export function updateInquiryStatus(id, status) {
  store.setState((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));
}

export function deleteInquiry(id) {
  store.setState((list) => list.filter((i) => i.id !== id));
}

export function useInquiries() {
  const inquiries = useStore(store);
  return { inquiries, addInquiry, updateInquiryStatus, deleteInquiry };
}
