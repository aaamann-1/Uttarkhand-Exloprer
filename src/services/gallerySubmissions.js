import { createStore, submitPublicRecord } from "./createStore";
import { useStore } from "../hooks/useStore";

const store = createStore("uk_gallery_submissions", []);

// data: { image (public storage URL), place, title, visitorName, email, caption, region }
export async function addSubmission(data) {
  const entry = await submitPublicRecord("uk_gallery_submissions", data);
  store.setState((list) => [entry, ...list], { persistRemote: false });
  return entry;
}

export function approveSubmission(id) {
  store.setState((list) => list.map((s) => (s.id === id ? { ...s, status: "approved" } : s)));
}

export function deleteSubmission(id) {
  store.setState((list) => list.filter((s) => s.id !== id));
}

export function rejectSubmission(id, reason = "") {
  store.setState((list) =>
    list.map((s) => (s.id === id ? { ...s, status: "rejected", rejectionReason: reason } : s))
  );
}

export function useGallerySubmissions() {
  const submissions = useStore(store);
  return {
    submissions,
    pending: submissions.filter((s) => s.status === "pending"),
    approved: submissions.filter((s) => s.status === "approved"),
    rejected: submissions.filter((s) => s.status === "rejected"),
    addSubmission,
    approveSubmission,
    rejectSubmission,
    deleteSubmission,
  };
}
