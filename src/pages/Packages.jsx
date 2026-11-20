import { Link } from "react-router-dom";
import PageIntro from "../components/PageIntro";
import PackageCard from "../components/PackageCard";
import RegionTabs from "../components/RegionTabs";
import { useListRegion } from "../services/travelSection";
import { usePublicPackages } from "../services/content";
import { contentRegionNames, normalizeRegion } from "../data/regions";
import { getPackageCategoriesForSection } from "../data/packageCategories";

export default function Packages() {
  const region = useListRegion({ includeCombo: true });
  const packages = usePublicPackages("all");
  const groups = contentRegionNames
    .filter((name) => region === "all" || normalizeRegion(name) === region)
    .map((name) => ({ name, items: packages.filter((p) => normalizeRegion(p.region) === normalizeRegion(name)) }))
    .filter((g) => g.items.length > 0 || region !== "all");

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <PageIntro
        kicker="Packages"
        title="Ready-made routes, fully itemised"
        description="Each package comes with a day-by-day plan — stays, meals and transport already worked out. Use one as-is, or add its stops to your own trip."
      >
        <RegionTabs includeCombo />
        {getPackageCategoriesForSection(region).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/[0.08]">
            <span className="text-xs font-semibold text-mist-400 uppercase tracking-wider mr-1">Packages:</span>
            {getPackageCategoriesForSection(region).map((cat) => (
              <Link
                key={cat.path}
                to={cat.path}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/[0.04] text-pp-text hover:bg-white/10 hover:border-pp-accent/40 transition-colors"
              >
                {cat.label} →
              </Link>
            ))}
          </div>
        )}
      </PageIntro>

      {groups.map(({ name, items }) => (
        <section key={name} className="mb-16 last:mb-0" aria-labelledby={`pkg-${name}`}>
          <h2 id={`pkg-${name}`} className="font-display text-3xl text-mist-100 mb-6">
            {name === "Combo" ? "Uttarakhand + Goa" : name}
          </h2>
          {items.length === 0 ? (
            <p className="text-mist-400 font-body text-sm">No {name} packages are published right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
