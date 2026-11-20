// Used by the Navbar's Packages dropdown and Packages page filters.
export const uttarakhandPackageCategories = [
  { path: "/packages/honeymoon", label: "Honeymoon Packages", region: "uttarakhand" },
  { path: "/packages/local-tours", label: "Local-Tour Packages", region: "uttarakhand" },
  { path: "/packages/spiritual", label: "Spiritual Packages", region: "uttarakhand" },
  { path: "/packages/uttarakhand-tours", label: "Uttarakhand-Tour Packages", region: "uttarakhand" },
];

export const goaPackageCategories = [
  { path: "/packages/goa-honeymoon", label: "Honeymoon Packages", region: "goa" },
  { path: "/packages/goa-local-tours", label: "Local-Tour Packages", region: "goa" },
  { path: "/packages/goa-heritage", label: "Heritage & Spiritual Packages", region: "goa" },
  { path: "/packages/goa-tours", label: "Goa-Tour Packages", region: "goa" },
];

export const packageCategories = uttarakhandPackageCategories;

export function getPackageCategoriesForSection(sectionId = "all") {
  if (sectionId === "goa") {
    return goaPackageCategories;
  }
  if (sectionId === "uttarakhand") {
    return uttarakhandPackageCategories;
  }
  // When active section is "all" or default:
  return [
    ...uttarakhandPackageCategories,
    ...goaPackageCategories.map((c) => ({ ...c, label: `Goa: ${c.label}` })),
  ];
}
